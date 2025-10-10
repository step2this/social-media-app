/**
 * DynamoDB update expression builder utilities
 * Provides pure functional builders for constructing UpdateExpression
 */

/**
 * Field update operation types
 */
export type UpdateOperation = 'SET' | 'ADD' | 'REMOVE';

/**
 * Field update specification
 */
export interface FieldUpdate {
  readonly field: string;
  readonly value: unknown;
  readonly operation?: UpdateOperation;
}

/**
 * Update expression result
 */
export interface UpdateExpressionResult {
  readonly UpdateExpression: string;
  readonly ExpressionAttributeNames: Record<string, string>;
  readonly ExpressionAttributeValues: Record<string, unknown>;
}

/**
 * Creates a field update specification
 * Convenience function for creating FieldUpdate objects
 *
 * @param field - Field name to update
 * @param value - Value to set
 * @param operation - Update operation (defaults to 'SET')
 * @returns FieldUpdate specification
 *
 * @example
 * ```typescript
 * const update = createFieldUpdate('caption', 'New caption');
 * const increment = createFieldUpdate('likesCount', 1, 'ADD');
 * ```
 */
export const createFieldUpdate = (
  field: string,
  value: unknown,
  operation: UpdateOperation = 'SET'
): FieldUpdate => ({
  field,
  value,
  operation
});

/**
 * Builds DynamoDB UpdateExpression from field updates
 * Pure function - constructs update expression components
 *
 * @param updates - Array of field updates
 * @returns UpdateExpression components
 *
 * @example
 * ```typescript
 * const updates = [
 *   { field: 'caption', value: 'Updated', operation: 'SET' },
 *   { field: 'likesCount', value: 1, operation: 'ADD' }
 * ];
 * const result = buildUpdateExpression(updates);
 * ```
 */
export const buildUpdateExpression = (
  updates: readonly FieldUpdate[]
): UpdateExpressionResult => {
  if (updates.length === 0) {
    return {
      UpdateExpression: '',
      ExpressionAttributeNames: {},
      ExpressionAttributeValues: {}
    };
  }

  const expressionAttributeNames: Record<string, string> = {};
  const expressionAttributeValues: Record<string, unknown> = {};

  // Group updates by operation type
  const setUpdates: FieldUpdate[] = [];
  const addUpdates: FieldUpdate[] = [];
  const removeUpdates: FieldUpdate[] = [];

  updates.forEach(update => {
    const operation = update.operation || 'SET';
    switch (operation) {
      case 'SET':
        setUpdates.push(update);
        break;
      case 'ADD':
        addUpdates.push(update);
        break;
      case 'REMOVE':
        removeUpdates.push(update);
        break;
    }
  });

  // Build expression parts
  const expressionParts: string[] = [];

  // SET operations
  if (setUpdates.length > 0) {
    const setParts = setUpdates.map(update => {
      expressionAttributeNames[`#${update.field}`] = update.field;
      expressionAttributeValues[`:${update.field}`] = update.value;
      return `#${update.field} = :${update.field}`;
    });
    expressionParts.push(`SET ${setParts.join(', ')}`);
  }

  // ADD operations
  if (addUpdates.length > 0) {
    const addParts = addUpdates.map(update => {
      expressionAttributeNames[`#${update.field}`] = update.field;
      expressionAttributeValues[`:${update.field}`] = update.value;
      return `#${update.field} :${update.field}`;
    });
    expressionParts.push(`ADD ${addParts.join(', ')}`);
  }

  // REMOVE operations
  if (removeUpdates.length > 0) {
    const removeParts = removeUpdates.map(update => {
      expressionAttributeNames[`#${update.field}`] = update.field;
      return `#${update.field}`;
    });
    expressionParts.push(`REMOVE ${removeParts.join(', ')}`);
  }

  return {
    UpdateExpression: expressionParts.join(' '),
    ExpressionAttributeNames: expressionAttributeNames,
    ExpressionAttributeValues: expressionAttributeValues
  };
};

/**
 * Builds update expression from a partial update object
 * Convenience function that converts object to field updates
 *
 * @param updates - Object with field updates
 * @param operation - Default operation for all fields
 * @returns UpdateExpression components
 *
 * @example
 * ```typescript
 * const result = buildUpdateExpressionFromObject({
 *   caption: 'New caption',
 *   isPublic: false
 * });
 * ```
 */
export const buildUpdateExpressionFromObject = (
  updates: Record<string, unknown>,
  operation: UpdateOperation = 'SET'
): UpdateExpressionResult => {
  const fieldUpdates: FieldUpdate[] = Object.entries(updates).map(
    ([field, value]) => ({
      field,
      value,
      operation
    })
  );

  return buildUpdateExpression(fieldUpdates);
};
