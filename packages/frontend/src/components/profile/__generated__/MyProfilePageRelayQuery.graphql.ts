/**
 * @generated SignedSource<<57f75f597426b8d0b61b7f29d4dcf567>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type MyProfilePageRelayQuery$variables = Record<PropertyKey, never>;
export type MyProfilePageRelayQuery$data = {
  readonly me: {
    readonly bio: string | null | undefined;
    readonly createdAt: string;
    readonly followersCount: number;
    readonly followingCount: number;
    readonly fullName: string | null | undefined;
    readonly handle: string;
    readonly id: string;
    readonly postsCount: number;
    readonly profilePictureUrl: string | null | undefined;
    readonly username: string;
  };
};
export type MyProfilePageRelayQuery = {
  response: MyProfilePageRelayQuery$data;
  variables: MyProfilePageRelayQuery$variables;
};

const node: ConcreteRequest = (function(){
var v0 = [
  {
    "alias": null,
    "args": null,
    "concreteType": "Profile",
    "kind": "LinkedField",
    "name": "me",
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
        "name": "username",
        "storageKey": null
      },
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
        "name": "fullName",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "bio",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "profilePictureUrl",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "followersCount",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "followingCount",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "postsCount",
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
  }
];
return {
  "fragment": {
    "argumentDefinitions": [],
    "kind": "Fragment",
    "metadata": null,
    "name": "MyProfilePageRelayQuery",
    "selections": (v0/*: any*/),
    "type": "Query",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": [],
    "kind": "Operation",
    "name": "MyProfilePageRelayQuery",
    "selections": (v0/*: any*/)
  },
  "params": {
    "cacheID": "8aedba8021ba5e63835ca691235cc2b5",
    "id": null,
    "metadata": {},
    "name": "MyProfilePageRelayQuery",
    "operationKind": "query",
    "text": "query MyProfilePageRelayQuery {\n  me {\n    id\n    username\n    handle\n    fullName\n    bio\n    profilePictureUrl\n    followersCount\n    followingCount\n    postsCount\n    createdAt\n  }\n}\n"
  }
};
})();

(node as any).hash = "9cb4f36c1d233a3a63a2a31a8bc29c38";

export default node;
