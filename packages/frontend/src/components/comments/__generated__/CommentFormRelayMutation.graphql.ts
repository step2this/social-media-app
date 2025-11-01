/**
 * @generated SignedSource<<e7ce1ae74abce06fc338d48f7d8fc384>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type CreateCommentInput = {
  content: string;
  postId: string;
};
export type CommentFormRelayMutation$variables = {
  input: CreateCommentInput;
};
export type CommentFormRelayMutation$data = {
  readonly createComment: {
    readonly author: {
      readonly handle: string;
      readonly id: string;
      readonly username: string;
    };
    readonly content: string;
    readonly createdAt: string;
    readonly id: string;
    readonly postId: string;
    readonly userId: string;
  };
};
export type CommentFormRelayMutation = {
  response: CommentFormRelayMutation$data;
  variables: CommentFormRelayMutation$variables;
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
    "concreteType": "Comment",
    "kind": "LinkedField",
    "name": "createComment",
    "plural": false,
    "selections": [
      (v1/*: any*/),
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "postId",
        "storageKey": null
      },
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
        "name": "content",
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
  }
];
return {
  "fragment": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Fragment",
    "metadata": null,
    "name": "CommentFormRelayMutation",
    "selections": (v2/*: any*/),
    "type": "Mutation",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Operation",
    "name": "CommentFormRelayMutation",
    "selections": (v2/*: any*/)
  },
  "params": {
    "cacheID": "460b4cd6b2ab49e56b43bb962155e41a",
    "id": null,
    "metadata": {},
    "name": "CommentFormRelayMutation",
    "operationKind": "mutation",
    "text": "mutation CommentFormRelayMutation(\n  $input: CreateCommentInput!\n) {\n  createComment(input: $input) {\n    id\n    postId\n    userId\n    content\n    createdAt\n    author {\n      id\n      handle\n      username\n    }\n  }\n}\n"
  }
};
})();

(node as any).hash = "3277c715445e96330cba9f6f0d143afe";

export default node;
