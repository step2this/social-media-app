/**
 * @generated SignedSource<<93fd3fd24910b3e7a20c6859b1d40439>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type PostDetailPageRelayQuery$variables = {
  postId: string;
};
export type PostDetailPageRelayQuery$data = {
  readonly post: {
    readonly author: {
      readonly fullName: string | null | undefined;
      readonly handle: string;
      readonly id: string;
      readonly profilePictureUrl: string | null | undefined;
      readonly username: string;
    };
    readonly caption: string | null | undefined;
    readonly commentsCount: number;
    readonly createdAt: string;
    readonly id: string;
    readonly imageUrl: string;
    readonly isLiked: boolean | null | undefined;
    readonly likesCount: number;
    readonly thumbnailUrl: string;
    readonly updatedAt: string;
    readonly userId: string;
  } | null | undefined;
};
export type PostDetailPageRelayQuery = {
  response: PostDetailPageRelayQuery$data;
  variables: PostDetailPageRelayQuery$variables;
};

const node: ConcreteRequest = (function(){
var v0 = [
  {
    "defaultValue": null,
    "kind": "LocalArgument",
    "name": "postId"
  }
],
v1 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "id",
  "storageKey": null
},
v2 = [
  {
    "alias": null,
    "args": [
      {
        "kind": "Variable",
        "name": "id",
        "variableName": "postId"
      }
    ],
    "concreteType": "Post",
    "kind": "LinkedField",
    "name": "post",
    "plural": false,
    "selections": [
      (v1/*: any*/),
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "userId",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "caption",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "imageUrl",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "thumbnailUrl",
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
        "name": "commentsCount",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "isLiked",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "createdAt",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "updatedAt",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "concreteType": "PublicProfile",
        "kind": "LinkedField",
        "name": "author",
        "plural": false,
        "selections": [
          (v1/*: any*/),
          {
            "alias": null,
            "args": null,
            "kind": "ScalarField",
            "name": "handle",
            "storageKey": null
          },
          {
            "alias": null,
            "args": null,
            "kind": "ScalarField",
            "name": "username",
            "storageKey": null
          },
          {
            "alias": null,
            "args": null,
            "kind": "ScalarField",
            "name": "fullName",
            "storageKey": null
          },
          {
            "alias": null,
            "args": null,
            "kind": "ScalarField",
            "name": "profilePictureUrl",
            "storageKey": null
          }
        ],
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
    "name": "PostDetailPageRelayQuery",
    "selections": (v2/*: any*/),
    "type": "Query",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Operation",
    "name": "PostDetailPageRelayQuery",
    "selections": (v2/*: any*/)
  },
  "params": {
    "cacheID": "e52da865eabd326b26c6a897222552a1",
    "id": null,
    "metadata": {},
    "name": "PostDetailPageRelayQuery",
    "operationKind": "query",
    "text": "query PostDetailPageRelayQuery(\n  $postId: ID!\n) {\n  post(id: $postId) {\n    id\n    userId\n    caption\n    imageUrl\n    thumbnailUrl\n    likesCount\n    commentsCount\n    isLiked\n    createdAt\n    updatedAt\n    author {\n      id\n      handle\n      username\n      fullName\n      profilePictureUrl\n    }\n  }\n}\n"
  }
};
})();

(node as any).hash = "0e339e442cad675c780a4fef0ee8b27e";

export default node;
