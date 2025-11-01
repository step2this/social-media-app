/**
 * @generated SignedSource<<564e6e407669ec8662d851422c6fe181>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type PostCardRelayLikeMutation$variables = {
  postId: string;
};
export type PostCardRelayLikeMutation$data = {
  readonly likePost: {
    readonly isLiked: boolean;
    readonly likesCount: number;
    readonly success: boolean;
  };
};
export type PostCardRelayLikeMutation = {
  response: PostCardRelayLikeMutation$data;
  variables: PostCardRelayLikeMutation$variables;
};

const node: ConcreteRequest = (function(){
var v0 = [
  {
    "defaultValue": null,
    "kind": "LocalArgument",
    "name": "postId"
  }
],
v1 = [
  {
    "alias": null,
    "args": [
      {
        "kind": "Variable",
        "name": "postId",
        "variableName": "postId"
      }
    ],
    "concreteType": "LikeResponse",
    "kind": "LinkedField",
    "name": "likePost",
    "plural": false,
    "selections": [
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "success",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "likesCount",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "isLiked",
        "storageKey": null
      }
    ],
    "storageKey": null
  }
];
return {
  "fragment": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Fragment",
    "metadata": null,
    "name": "PostCardRelayLikeMutation",
    "selections": (v1/*: any*/),
    "type": "Mutation",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Operation",
    "name": "PostCardRelayLikeMutation",
    "selections": (v1/*: any*/)
  },
  "params": {
    "cacheID": "fe435048a2063d50f22c46adcf93b941",
    "id": null,
    "metadata": {},
    "name": "PostCardRelayLikeMutation",
    "operationKind": "mutation",
    "text": "mutation PostCardRelayLikeMutation(\n  $postId: ID!\n) {\n  likePost(postId: $postId) {\n    success\n    likesCount\n    isLiked\n  }\n}\n"
  }
};
})();

(node as any).hash = "bf9a7c24481c97b41793f02c3f5f5c8c";

export default node;
