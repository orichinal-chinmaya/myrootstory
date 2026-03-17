/**
 * Evaluates a conditionRule string against a set of interview answers.
 * 
 * Supported syntax:
 *   X = "value"                          — equality
 *   X ≠ "value"                          — inequality  
 *   X includes "value"                   — array includes (for multi-select)
 *   X ∈ {"val1", "val2", ...}            — set membership
 *   X > Y                                — numeric comparison between two question answers
 *   X = "val1" OR "val2"                 — equality against multiple values (shorthand)
 *   X = any "prefix" answer              — answer starts with prefix
 *   compound expressions joined by OR    — logical OR
 *   compound expressions joined by AND   — logical AND (higher precedence)
 *
 * Returns true if the condition is met (question should be shown).
 * Returns true if conditionRule is empty/undefined (always-show fallback).
 */
export function evaluateConditionRule(
  rule: string | undefined | null,
  answers: Record<string, unknown>
): boolean {
  if (!rule || !rule.trim()) return true;

  // Split on top-level OR (not inside quotes/braces)
  const orClauses = splitTopLevel(rule, " OR ");
  return orClauses.some(clause => evaluateClause(clause.trim(), answers));
}

function evaluateClause(clause: string, answers: Record<string, unknown>): boolean {
  // Split on AND
  const andParts = splitTopLevel(clause, " AND ");
  if (andParts.length > 1) {
    return andParts.every(part => evaluateClause(part.trim(), answers));
  }

  // Handle: X > Y (comparison between two question answers)
  const gtMatch = clause.match(/^([A-Z]{1,4}-?\d+[a-z]?)\s*>\s*([A-Z]{1,4}-?\d+[a-z]?)$/);
  if (gtMatch) {
    const left = Number(answers[gtMatch[1]] || 0);
    const right = Number(answers[gtMatch[2]] || 0);
    return left > right;
  }

  // Handle: X includes "value"
  const includesMatch = clause.match(/^([A-Z]{1,4}-?\d+[a-z]?)\s+includes\s+"([^"]+)"$/);
  if (includesMatch) {
    const val = answers[includesMatch[1]];
    if (Array.isArray(val)) return val.includes(includesMatch[2]);
    return String(val || "") === includesMatch[2];
  }

  // Handle: X ∈ {"val1", "val2", ...}
  const inSetMatch = clause.match(/^([A-Z]{1,4}-?\d+[a-z]?)\s*∈\s*\{([^}]+)\}$/);
  if (inSetMatch) {
    const val = String(answers[inSetMatch[1]] || "");
    const setItems = inSetMatch[2].split(",").map(s => s.trim().replace(/^"|"$/g, ""));
    return setItems.includes(val);
  }

  // Handle: X ≠ "value"
  const neqMatch = clause.match(/^([A-Z]{1,4}-?\d+[a-z]?)\s*≠\s*"([^"]+)"$/);
  if (neqMatch) {
    const val = answers[neqMatch[1]];
    if (val === undefined || val === null) return false; // no answer yet = don't show
    return String(val) !== neqMatch[2];
  }

  // Handle: X = any "prefix" answer
  const anyMatch = clause.match(/^([A-Z]{1,4}-?\d+[a-z]?)\s*=\s*any\s+"([^"]+)"\s*answer$/);
  if (anyMatch) {
    const val = String(answers[anyMatch[1]] || "");
    return val.startsWith(anyMatch[2]);
  }

  // Handle: X = "value" (possibly with additional OR "value2" already split)
  const eqMatch = clause.match(/^([A-Z]{1,4}-?\d+[a-z]?)\s*=\s*"([^"]+)"$/);
  if (eqMatch) {
    const val = answers[eqMatch[1]];
    if (Array.isArray(val)) return val.includes(eqMatch[2]);
    return String(val || "") === eqMatch[2];
  }

  // Handle bare quoted value (from OR split of `X = "val1" OR "val2"`)
  // This shouldn't happen with proper splitting, but as fallback:
  const bareQuote = clause.match(/^"([^"]+)"$/);
  if (bareQuote) {
    // Can't evaluate without context — treat as false
    return false;
  }

  // Fallback: try to evaluate as a simple truthy check
  console.warn(`[conditionEvaluator] Could not parse clause: "${clause}"`);
  return false;
}

/**
 * Split a string by a delimiter, but only at the top level
 * (not inside quoted strings or curly braces).
 */
function splitTopLevel(input: string, delimiter: string): string[] {
  const results: string[] = [];
  let depth = 0;
  let inQuote = false;
  let current = "";

  for (let i = 0; i < input.length; i++) {
    const ch = input[i];

    if (ch === '"' && input[i - 1] !== '\\') {
      inQuote = !inQuote;
      current += ch;
      continue;
    }

    if (inQuote) {
      current += ch;
      continue;
    }

    if (ch === '{') { depth++; current += ch; continue; }
    if (ch === '}') { depth--; current += ch; continue; }

    if (depth === 0 && input.substring(i, i + delimiter.length) === delimiter) {
      results.push(current);
      current = "";
      i += delimiter.length - 1;
      continue;
    }

    current += ch;
  }

  if (current) results.push(current);
  return results;
}

/**
 * Normalize conditionRule strings that use shorthand OR for multiple values.
 * e.g. `WE-4 = "Yes, a lot more" OR "Yes, a little more"`
 * becomes `WE-4 = "Yes, a lot more" OR WE-4 = "Yes, a little more"`
 * 
 * Call this before evaluateConditionRule for best results.
 */
export function normalizeConditionRule(rule: string | undefined | null): string {
  if (!rule) return "";

  // Expand shorthand: `X = "val1" OR "val2"` → `X = "val1" OR X = "val2"`
  // Also handles `X includes "val1" OR "val2"` → `X includes "val1" OR X includes "val2"`
  const expandedParts: string[] = [];
  const orParts = splitTopLevel(rule, " OR ");

  let lastSubject = "";
  let lastOperator = "";

  for (const part of orParts) {
    const trimmed = part.trim();

    // Check if this part has a subject (question ID)
    const fullMatch = trimmed.match(/^([A-Z]{1,4}-?\d+[a-z]?)\s+(=|≠|includes|∈|>)\s+(.+)$/);
    if (fullMatch) {
      lastSubject = fullMatch[1];
      lastOperator = fullMatch[2];
      expandedParts.push(trimmed);
    } else if (trimmed.startsWith('"') && lastSubject && lastOperator) {
      // Bare quoted value — expand with last subject+operator
      expandedParts.push(`${lastSubject} ${lastOperator} ${trimmed}`);
    } else {
      // Some other expression (e.g. X > Y)
      expandedParts.push(trimmed);
      lastSubject = "";
      lastOperator = "";
    }
  }

  return expandedParts.join(" OR ");
}

/**
 * Combined: normalize then evaluate.
 */
export function evaluateCondition(
  rule: string | undefined | null,
  answers: Record<string, unknown>
): boolean {
  return evaluateConditionRule(normalizeConditionRule(rule), answers);
}
