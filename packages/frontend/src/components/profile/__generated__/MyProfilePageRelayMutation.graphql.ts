/**
 * @generated SignedSource<<2bb344fea96c365cb8be7bacd519c0a8>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type UpdateProfileInput = {
  bio?: string | null | undefined;
  displayName?: string | null | undefined;
  fullName?: string | null | undefined;
  handle?: string | null | undefined;
};
export type MyProfilePageRelayMutation$variables = {
  input: UpdateProfileInput;
};
export type MyProfilePageRelayMutation$data = {
  readonly updateProfile: {
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
export type MyProfilePageRelayMutation = {
  response: MyProfilePageRelayMutation$data;
  variables: MyProfilePageRelayMutation$variables;
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
    "alias": null,
    "args": [
      {
        "kind": "Variable",
        "name": "input",
        "variableName": "input"
      }
    ],
    "concreteType": "Profile",
    "kind": "LinkedField",
    "name": "updateProfile",
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
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Fragment",
    "metadata": null,
    "name": "MyProfilePageRelayMutation",
    "selections": (v1/*: any*/),
    "type": "Mutation",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Operation",
    "name": "MyProfilePageRelayMutation",
    "selections": (v1/*: any*/)
  },
  "params": {
    "cacheID": "38666f6d53690e519e8342d649b1325e",
    "id": null,
    "metadata": {},
    "name": "MyProfilePageRelayMutation",
    "operationKind": "mutation",
    "text": "mutation MyProfilePageRelayMutation(\n  $input: UpdateProfileInput!\n) {\n  updateProfile(input: $input) {\n    id\n    username\n    handle\n    fullName\n    bio\n    profilePictureUrl\n    followersCount\n    followingCount\n    postsCount\n    createdAt\n  }\n}\n"
  }
};
})();

(node as any).hash = "300fd37e3f09fdf178ec05791e20f134";

export default node;
