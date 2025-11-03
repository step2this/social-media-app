/**
 * @generated SignedSource<<5f9459c37b646c5d49cb3d5eee7e1abd>>
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
    readonly email: string;
    readonly emailVerified: boolean;
    readonly followersCount: number;
    readonly followingCount: number;
    readonly fullName: string | null | undefined;
    readonly handle: string;
    readonly id: string;
    readonly postsCount: number;
    readonly profilePictureThumbnailUrl: string | null | undefined;
    readonly profilePictureUrl: string | null | undefined;
    readonly updatedAt: string;
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
        "name": "profilePictureThumbnailUrl",
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
        "kind": "ScalarField",
        "name": "email",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "emailVerified",
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
    "cacheID": "3a94e536f826b29a0401d268c114fd71",
    "id": null,
    "metadata": {},
    "name": "MyProfilePageRelayQuery",
    "operationKind": "query",
    "text": "query MyProfilePageRelayQuery {\n  me {\n    id\n    username\n    handle\n    fullName\n    bio\n    profilePictureUrl\n    profilePictureThumbnailUrl\n    followersCount\n    followingCount\n    postsCount\n    createdAt\n    updatedAt\n    email\n    emailVerified\n  }\n}\n"
  }
};
})();

(node as any).hash = "aca284a9ae118a6ca5e50d4e6309d2e9";

export default node;
