/**
 * @generated SignedSource<<9dcde8e57d6d9708687809ef6ab6afdc>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type useFeedItemAutoReadMutation$variables = {
  postIds: ReadonlyArray<string>;
};
export type useFeedItemAutoReadMutation$data = {
  readonly markFeedItemsAsRead: {
    readonly updatedCount: number;
  };
};
export type useFeedItemAutoReadMutation = {
  response: useFeedItemAutoReadMutation$data;
  variables: useFeedItemAutoReadMutation$variables;
};

const node: ConcreteRequest = (function(){
var v0 = [
  {
    "defaultValue": null,
    "kind": "LocalArgument",
    "name": "postIds"
  }
],
v1 = [
  {
    "alias": null,
    "args": [
      {
        "kind": "Variable",
        "name": "postIds",
        "variableName": "postIds"
      }
    ],
    "concreteType": "MarkFeedReadResponse",
    "kind": "LinkedField",
    "name": "markFeedItemsAsRead",
    "plural": false,
    "selections": [
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "updatedCount",
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
    "name": "useFeedItemAutoReadMutation",
    "selections": (v1/*: any*/),
    "type": "Mutation",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Operation",
    "name": "useFeedItemAutoReadMutation",
    "selections": (v1/*: any*/)
  },
  "params": {
    "cacheID": "5ba1c880d6b2774e4d798b9b83f97962",
    "id": null,
    "metadata": {},
    "name": "useFeedItemAutoReadMutation",
    "operationKind": "mutation",
    "text": "mutation useFeedItemAutoReadMutation(\n  $postIds: [ID!]!\n) {\n  markFeedItemsAsRead(postIds: $postIds) {\n    updatedCount\n  }\n}\n"
  }
};
})();

(node as any).hash = "2362db994767df015a6fec95bedb9565";

export default node;
