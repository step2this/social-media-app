/**
 * @generated SignedSource<<11ac8290bfd464388497454e9646b84b>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type PlaceBidInput = {
  amount: number;
  auctionId: string;
};
export type usePlaceBidMutation$variables = {
  input: PlaceBidInput;
};
export type usePlaceBidMutation$data = {
  readonly placeBid: {
    readonly auction: {
      readonly bidCount: number;
      readonly currentPrice: number;
      readonly id: string;
    };
    readonly bid: {
      readonly amount: number;
      readonly auctionId: string;
      readonly createdAt: string;
      readonly id: string;
      readonly userId: string;
    };
  };
};
export type usePlaceBidMutation = {
  response: usePlaceBidMutation$data;
  variables: usePlaceBidMutation$variables;
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
    "kind": "ClientExtension",
    "selections": [
      {
        "alias": null,
        "args": [
          {
            "kind": "Variable",
            "name": "input",
            "variableName": "input"
          }
        ],
        "concreteType": "PlaceBidPayload",
        "kind": "LinkedField",
        "name": "placeBid",
        "plural": false,
        "selections": [
          {
            "alias": null,
            "args": null,
            "concreteType": "Bid",
            "kind": "LinkedField",
            "name": "bid",
            "plural": false,
            "selections": [
              (v1/*: any*/),
              {
                "alias": null,
                "args": null,
                "kind": "ScalarField",
                "name": "auctionId",
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
                "name": "amount",
                "storageKey": null
              },
              {
                "alias": null,
                "args": null,
                "kind": "ScalarField",
                "name": "createdAt",
                "storageKey": null
              }
            ],
            "storageKey": null
          },
          {
            "alias": null,
            "args": null,
            "concreteType": "Auction",
            "kind": "LinkedField",
            "name": "auction",
            "plural": false,
            "selections": [
              (v1/*: any*/),
              {
                "alias": null,
                "args": null,
                "kind": "ScalarField",
                "name": "currentPrice",
                "storageKey": null
              },
              {
                "alias": null,
                "args": null,
                "kind": "ScalarField",
                "name": "bidCount",
                "storageKey": null
              }
            ],
            "storageKey": null
          }
        ],
        "storageKey": null
      }
    ]
  }
];
return {
  "fragment": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Fragment",
    "metadata": null,
    "name": "usePlaceBidMutation",
    "selections": (v2/*: any*/),
    "type": "Mutation",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Operation",
    "name": "usePlaceBidMutation",
    "selections": (v2/*: any*/)
  },
  "params": {
    "cacheID": "3f3719a3d27edbab98171c049898e6d1",
    "id": null,
    "metadata": {},
    "name": "usePlaceBidMutation",
    "operationKind": "mutation",
    "text": null
  }
};
})();

(node as any).hash = "4f22f9d84d8fbe9db608e1c1d0e226b1";

export default node;
