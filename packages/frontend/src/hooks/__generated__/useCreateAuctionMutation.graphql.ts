/**
 * @generated SignedSource<<c4f4fc9d8419c33e7c3abd3424c4a201>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type AuctionStatus = "ACTIVE" | "CANCELLED" | "COMPLETED" | "PENDING" | "%future added value";
export type CreateAuctionInput = {
  description?: string | null | undefined;
  endTime: string;
  fileType: string;
  reservePrice?: number | null | undefined;
  startPrice: number;
  startTime: string;
  title: string;
};
export type useCreateAuctionMutation$variables = {
  input: CreateAuctionInput;
};
export type useCreateAuctionMutation$data = {
  readonly createAuction: {
    readonly auction: {
      readonly bidCount: number;
      readonly createdAt: string;
      readonly currentPrice: number;
      readonly description: string | null | undefined;
      readonly endTime: string;
      readonly id: string;
      readonly imageUrl: string;
      readonly reservePrice: number | null | undefined;
      readonly startPrice: number;
      readonly startTime: string;
      readonly status: AuctionStatus;
      readonly title: string;
      readonly userId: string;
    };
    readonly uploadUrl: string;
  };
};
export type useCreateAuctionMutation = {
  response: useCreateAuctionMutation$data;
  variables: useCreateAuctionMutation$variables;
};

const node: ConcreteRequest = (function(){
var v0 = [
  {
    "defaultValue": null,
    "kind": "LocalArgument",
    "name": "input"
  }
],
v1 = [
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
        "concreteType": "CreateAuctionPayload",
        "kind": "LinkedField",
        "name": "createAuction",
        "plural": false,
        "selections": [
          {
            "alias": null,
            "args": null,
            "concreteType": "Auction",
            "kind": "LinkedField",
            "name": "auction",
            "plural": false,
            "selections": [
              {
                "alias": null,
                "args": null,
                "kind": "ScalarField",
                "name": "id",
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
                "name": "title",
                "storageKey": null
              },
              {
                "alias": null,
                "args": null,
                "kind": "ScalarField",
                "name": "description",
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
                "name": "startPrice",
                "storageKey": null
              },
              {
                "alias": null,
                "args": null,
                "kind": "ScalarField",
                "name": "reservePrice",
                "storageKey": null
              },
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
                "name": "status",
                "storageKey": null
              },
              {
                "alias": null,
                "args": null,
                "kind": "ScalarField",
                "name": "startTime",
                "storageKey": null
              },
              {
                "alias": null,
                "args": null,
                "kind": "ScalarField",
                "name": "endTime",
                "storageKey": null
              },
              {
                "alias": null,
                "args": null,
                "kind": "ScalarField",
                "name": "bidCount",
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
            "kind": "ScalarField",
            "name": "uploadUrl",
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
    "name": "useCreateAuctionMutation",
    "selections": (v1/*: any*/),
    "type": "Mutation",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Operation",
    "name": "useCreateAuctionMutation",
    "selections": (v1/*: any*/)
  },
  "params": {
    "cacheID": "9c83f70ad2e1ad847d63723ef37c155a",
    "id": null,
    "metadata": {},
    "name": "useCreateAuctionMutation",
    "operationKind": "mutation",
    "text": null
  }
};
})();

(node as any).hash = "cd9f1fdd8dc435acd5b2ad47f41e31db";

export default node;
