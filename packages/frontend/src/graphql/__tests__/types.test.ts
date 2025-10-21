/**
 * Type system tests using vitest's expectTypeOf
 * These tests run at compile-time to ensure type safety
 */
import { describe, test, expect, expectTypeOf } from 'vitest';
import type {
    AsyncState,
    GraphQLError,
    GraphQLQuery,
    GraphQLMutation,
    ExtractVariables,
    ExtractResponse,
} from '../types.js';
import {
    isIdle,
    isLoading,
    isSuccess,
    isError,
    assertSuccess,
    assertError,
} from '../types.js';

describe('GraphQL Type System', () => {
    describe('AsyncState discriminated union', () => {
        test('success state has data property', () => {
            type State = AsyncState<string>;
            type SuccessState = Extract<State, { status: 'success' }>;

            expectTypeOf<SuccessState>().toHaveProperty('data');
            expectTypeOf<SuccessState['data']>().toBeString();
        });

        test('error state has error property', () => {
            type State = AsyncState<string>;
            type ErrorState = Extract<State, { status: 'error' }>;

            expectTypeOf<ErrorState>().toHaveProperty('error');
            expectTypeOf<ErrorState['error']>().toMatchTypeOf<GraphQLError>();
        });

        test('idle state has no extra properties', () => {
            type State = AsyncState<string>;
            type IdleState = Extract<State, { status: 'idle' }>;

            expectTypeOf<IdleState>().toEqualTypeOf<{ status: 'idle' }>();
        });

        test('loading state has no extra properties', () => {
            type State = AsyncState<string>;
            type LoadingState = Extract<State, { status: 'loading' }>;

            expectTypeOf<LoadingState>().toEqualTypeOf<{ status: 'loading' }>();
        });
    });

    describe('GraphQL Operation types', () => {
        interface User {
            id: string;
            name: string;
        }

        test('GraphQLQuery has correct structure', () => {
            type GetUserQuery = GraphQLQuery<
                'GetUser',
                { id: string },
                { user: User }
            >;

            expectTypeOf<GetUserQuery>().toHaveProperty('name');
            expectTypeOf<GetUserQuery>().toHaveProperty('variables');
            expectTypeOf<GetUserQuery>().toHaveProperty('response');
            expectTypeOf<GetUserQuery>().toHaveProperty('operationType');
        });

        test('GraphQLMutation has correct structure', () => {
            type UpdateUserMutation = GraphQLMutation<
                'UpdateUser',
                { id: string; name: string },
                { user: User }
            >;

            expectTypeOf<UpdateUserMutation>().toHaveProperty('name');
            expectTypeOf<UpdateUserMutation>().toHaveProperty('operationType');
        });
    });

    describe('ExtractVariables conditional type', () => {
        interface User {
            id: string;
            name: string;
        }

        test('extracts variables from GraphQLQuery', () => {
            type GetUserQuery = GraphQLQuery<
                'GetUser',
                { id: string },
                { user: User }
            >;
            type Variables = ExtractVariables<GetUserQuery>;

            expectTypeOf<Variables>().toEqualTypeOf<{ id: string }>();
        });

        test('extracts variables from GraphQLMutation', () => {
            type UpdateUserMutation = GraphQLMutation<
                'UpdateUser',
                { id: string; name: string },
                { user: User }
            >;
            type Variables = ExtractVariables<UpdateUserMutation>;

            expectTypeOf<Variables>().toEqualTypeOf<{
                id: string;
                name: string;
            }>();
        });
    });

    describe('ExtractResponse conditional type', () => {
        interface User {
            id: string;
            name: string;
        }

        test('extracts response from GraphQLQuery', () => {
            type GetUserQuery = GraphQLQuery<
                'GetUser',
                { id: string },
                { user: User }
            >;
            type Response = ExtractResponse<GetUserQuery>;

            expectTypeOf<Response>().toEqualTypeOf<{ user: User }>();
        });

        test('extracts response from GraphQLMutation', () => {
            type UpdateUserMutation = GraphQLMutation<
                'UpdateUser',
                { id: string },
                { user: User | null }
            >;
            type Response = ExtractResponse<UpdateUserMutation>;

            expectTypeOf<Response>().toEqualTypeOf<{ user: User | null }>();
        });
    });

    describe('Type guards', () => {
        test('isSuccess narrows to success state', () => {
            const state: AsyncState<string> = { status: 'success', data: 'hello' };

            if (isSuccess(state)) {
                expectTypeOf(state).toEqualTypeOf<{
                    status: 'success';
                    data: string;
                }>();
                expect(state.data).toBe('hello');
            }
        });

        test('isError narrows to error state', () => {
            const state: AsyncState<string> = {
                status: 'error',
                error: { message: 'Test error' },
            };

            if (isError(state)) {
                expectTypeOf(state).toEqualTypeOf<{
                    status: 'error';
                    error: GraphQLError;
                }>();
                expect(state.error.message).toBe('Test error');
            }
        });

        test('isIdle narrows to idle state', () => {
            const state: AsyncState<string> = { status: 'idle' };

            if (isIdle(state)) {
                expectTypeOf(state).toEqualTypeOf<{ status: 'idle' }>();
                expect(state.status).toBe('idle');
            }
        });

        test('isLoading narrows to loading state', () => {
            const state: AsyncState<string> = { status: 'loading' };

            if (isLoading(state)) {
                expectTypeOf(state).toEqualTypeOf<{ status: 'loading' }>();
                expect(state.status).toBe('loading');
            }
        });
    });

    describe('Assertion functions', () => {
        test('assertSuccess narrows type and throws on non-success', () => {
            const successState: AsyncState<string> = {
                status: 'success',
                data: 'hello',
            };

            assertSuccess(successState);
            expectTypeOf(successState).toEqualTypeOf<{
                status: 'success';
                data: string;
            }>();
            expect(successState.data).toBe('hello');
        });

        test('assertSuccess throws on error state', () => {
            const errorState: AsyncState<string> = {
                status: 'error',
                error: { message: 'Test error' },
            };

            expect(() => assertSuccess(errorState)).toThrow(
                'Expected success state, got: error'
            );
        });

        test('assertError narrows type and throws on non-error', () => {
            const errorState: AsyncState<string> = {
                status: 'error',
                error: { message: 'Test error' },
            };

            assertError(errorState);
            expectTypeOf(errorState).toEqualTypeOf<{
                status: 'error';
                error: GraphQLError;
            }>();
            expect(errorState.error.message).toBe('Test error');
        });

        test('assertError throws on success state', () => {
            const successState: AsyncState<string> = {
                status: 'success',
                data: 'hello',
            };

            expect(() => assertError(successState)).toThrow(
                'Expected error state, got: success'
            );
        });
    });

    describe('Exhaustive type checking with switch', () => {
        test('switch statement handles all AsyncState cases', () => {
            const handleState = (state: AsyncState<number>): string => {
                switch (state.status) {
                    case 'idle':
                        return 'Idle';
                    case 'loading':
                        return 'Loading';
                    case 'success':
                        return `Success: ${state.data}`;
                    case 'error':
                        return `Error: ${state.error.message}`;
                    default: {
                        const _exhaustive: never = state;
                        return _exhaustive;
                    }
                }
            };

            expect(handleState({ status: 'idle' })).toBe('Idle');
            expect(handleState({ status: 'loading' })).toBe('Loading');
            expect(handleState({ status: 'success', data: 42 })).toBe('Success: 42');
            expect(
                handleState({ status: 'error', error: { message: 'Fail' } })
            ).toBe('Error: Fail');
        });
    });
});
