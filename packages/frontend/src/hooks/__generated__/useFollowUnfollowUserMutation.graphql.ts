/**
 * @generated SignedSource<<154cb518cea1e0b25f43fdb1ba58f39b>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type useFollowUnfollowUserMutation$variables = {
  userId: string;
};
export type useFollowUnfollowUserMutation$data = {
  readonly unfollowUser: {
    readonly followersCount: number;
    readonly followingCount: number;
    readonly isFollowing: boolean;
    readonly success: boolean;
  };
};
export type useFollowUnfollowUserMutation = {
  response: useFollowUnfollowUserMutation$data;
  variables: useFollowUnfollowUserMutation$variables;
};

const node: ConcreteRequest = (function(){
var v0 = [
  {
    "defaultValue": null,
    "kind": "LocalArgument",
    "name": "userId"
  }
],
v1 = [
  {
    "alias": null,
    "args": [
      {
        "kind": "Variable",
        "name": "userId",
        "variableName": "userId"
      }
    ],
    "concreteType": "FollowResponse",
    "kind": "LinkedField",
    "name": "unfollowUser",
    "plural": false,
    "selections": [
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "success",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "isFollowing",
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
    "name": "useFollowUnfollowUserMutation",
    "selections": (v1/*: any*/),
    "type": "Mutation",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Operation",
    "name": "useFollowUnfollowUserMutation",
    "selections": (v1/*: any*/)
  },
  "params": {
    "cacheID": "b8486f2be4bad6fce5aa2bcc3c3710be",
    "id": null,
    "metadata": {},
    "name": "useFollowUnfollowUserMutation",
    "operationKind": "mutation",
    "text": "mutation useFollowUnfollowUserMutation(\n  $userId: ID!\n) {\n  unfollowUser(userId: $userId) {\n    success\n    isFollowing\n    followersCount\n    followingCount\n  }\n}\n"
  }
};
})();

(node as any).hash = "396a3d1d1f5f7fc7ea6a8909e3a18e85";

export default node;
