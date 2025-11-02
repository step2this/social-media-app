/**
 * @generated SignedSource<<ec13df26c2260184495cfb53b405356a>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type useFeedItemAutoReadRelayMutation$variables = {
  postIds: ReadonlyArray<string>;
};
export type useFeedItemAutoReadRelayMutation$data = {
  readonly markFeedItemsAsRead: {
    readonly updatedCount: number;
  };
};
export type useFeedItemAutoReadRelayMutation = {
  response: useFeedItemAutoReadRelayMutation$data;
  variables: useFeedItemAutoReadRelayMutation$variables;
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
    "name": "useFeedItemAutoReadRelayMutation",
    "selections": (v1/*: any*/),
    "type": "Mutation",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Operation",
    "name": "useFeedItemAutoReadRelayMutation",
    "selections": (v1/*: any*/)
  },
  "params": {
    "cacheID": "013358a97df170e9592e845308cebd86",
    "id": null,
    "metadata": {},
    "name": "useFeedItemAutoReadRelayMutation",
    "operationKind": "mutation",
    "text": "mutation useFeedItemAutoReadRelayMutation(\n  $postIds: [ID!]!\n) {\n  markFeedItemsAsRead(postIds: $postIds) {\n    updatedCount\n  }\n}\n"
  }
};
})();

(node as any).hash = "c4c0554cf8e50f6a64d1bbda9365f05e";

export default node;
