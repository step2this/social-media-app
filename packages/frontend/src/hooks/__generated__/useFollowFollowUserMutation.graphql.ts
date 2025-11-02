/**
 * @generated SignedSource<<b34d5245e4af91e2818ea2418d109017>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type useFollowFollowUserMutation$variables = {
  userId: string;
};
export type useFollowFollowUserMutation$data = {
  readonly followUser: {
    readonly followersCount: number;
    readonly followingCount: number;
    readonly isFollowing: boolean;
    readonly success: boolean;
  };
};
export type useFollowFollowUserMutation = {
  response: useFollowFollowUserMutation$data;
  variables: useFollowFollowUserMutation$variables;
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
    "name": "followUser",
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
    "name": "useFollowFollowUserMutation",
    "selections": (v1/*: any*/),
    "type": "Mutation",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Operation",
    "name": "useFollowFollowUserMutation",
    "selections": (v1/*: any*/)
  },
  "params": {
    "cacheID": "cbedb8e34152b16a838333a93bff0954",
    "id": null,
    "metadata": {},
    "name": "useFollowFollowUserMutation",
    "operationKind": "mutation",
    "text": "mutation useFollowFollowUserMutation(\n  $userId: ID!\n) {\n  followUser(userId: $userId) {\n    success\n    isFollowing\n    followersCount\n    followingCount\n  }\n}\n"
  }
};
})();

(node as any).hash = "d19c82c9043a8cab916e758a88ca57c1";

export default node;
