/**
 * @generated SignedSource<<5b38a6b06a36f14e15d0af3b1a316c25>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type PostCardRelayUnlikeMutation$variables = {
  postId: string;
};
export type PostCardRelayUnlikeMutation$data = {
  readonly unlikePost: {
    readonly isLiked: boolean;
    readonly likesCount: number;
    readonly success: boolean;
  };
};
export type PostCardRelayUnlikeMutation = {
  response: PostCardRelayUnlikeMutation$data;
  variables: PostCardRelayUnlikeMutation$variables;
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
    "name": "unlikePost",
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
    "name": "PostCardRelayUnlikeMutation",
    "selections": (v1/*: any*/),
    "type": "Mutation",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Operation",
    "name": "PostCardRelayUnlikeMutation",
    "selections": (v1/*: any*/)
  },
  "params": {
    "cacheID": "3a31562590f36180381a90df84057556",
    "id": null,
    "metadata": {},
    "name": "PostCardRelayUnlikeMutation",
    "operationKind": "mutation",
    "text": "mutation PostCardRelayUnlikeMutation(\n  $postId: ID!\n) {\n  unlikePost(postId: $postId) {\n    success\n    likesCount\n    isLiked\n  }\n}\n"
  }
};
})();

(node as any).hash = "ae153322c1d6e6f35aeaf72e14fe0dcc";

export default node;
