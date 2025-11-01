/**
 * @generated SignedSource<<ba1af003ae5e31fa807b6076fd82060a>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type CreatePostInput = {
  caption?: string | null | undefined;
  fileType: string;
};
export type CreatePostPageRelayMutation$variables = {
  input: CreatePostInput;
};
export type CreatePostPageRelayMutation$data = {
  readonly createPost: {
    readonly post: {
      readonly author: {
        readonly handle: string;
        readonly id: string;
        readonly username: string;
      };
      readonly caption: string | null | undefined;
      readonly createdAt: string;
      readonly id: string;
      readonly imageUrl: string;
    };
    readonly thumbnailUploadUrl: string;
    readonly uploadUrl: string;
  };
};
export type CreatePostPageRelayMutation = {
  response: CreatePostPageRelayMutation$data;
  variables: CreatePostPageRelayMutation$variables;
};

const node: ConcreteRequest = (function(){
var v0 = [
  {
    "defaultValue": null,
    "kind": "LocalArgument",
    "name": "input"
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
        "name": "input",
        "variableName": "input"
      }
    ],
    "concreteType": "CreatePostPayload",
    "kind": "LinkedField",
    "name": "createPost",
    "plural": false,
    "selections": [
      {
        "alias": null,
        "args": null,
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
            "name": "imageUrl",
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
            "name": "createdAt",
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
              }
            ],
            "storageKey": null
          }
        ],
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "uploadUrl",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "thumbnailUploadUrl",
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
    "name": "CreatePostPageRelayMutation",
    "selections": (v2/*: any*/),
    "type": "Mutation",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Operation",
    "name": "CreatePostPageRelayMutation",
    "selections": (v2/*: any*/)
  },
  "params": {
    "cacheID": "c40308905b6e341878ef1b20de95bbde",
    "id": null,
    "metadata": {},
    "name": "CreatePostPageRelayMutation",
    "operationKind": "mutation",
    "text": "mutation CreatePostPageRelayMutation(\n  $input: CreatePostInput!\n) {\n  createPost(input: $input) {\n    post {\n      id\n      imageUrl\n      caption\n      createdAt\n      author {\n        id\n        handle\n        username\n      }\n    }\n    uploadUrl\n    thumbnailUploadUrl\n  }\n}\n"
  }
};
})();

(node as any).hash = "0252cb779542931ab047b7de9b4baf3c";

export default node;
