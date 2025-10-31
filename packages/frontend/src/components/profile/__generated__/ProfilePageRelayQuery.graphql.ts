/**
 * @generated SignedSource<<f8fa4b7e79a7250a4df2748a6a3797e7>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type ProfilePageRelayQuery$variables = {
  after?: string | null | undefined;
  first: number;
  handle: string;
};
export type ProfilePageRelayQuery$data = {
  readonly profile: {
    readonly bio: string | null | undefined;
    readonly followersCount: number;
    readonly followingCount: number;
    readonly fullName: string | null | undefined;
    readonly handle: string;
    readonly id: string;
    readonly isFollowing: boolean | null | undefined;
    readonly postsCount: number;
    readonly profilePictureUrl: string | null | undefined;
    readonly username: string;
  } | null | undefined;
  readonly userPosts: {
    readonly edges: ReadonlyArray<{
      readonly cursor: string;
      readonly node: {
        readonly commentsCount: number;
        readonly id: string;
        readonly imageUrl: string;
        readonly likesCount: number;
        readonly thumbnailUrl: string;
      };
    }>;
    readonly pageInfo: {
      readonly endCursor: string | null | undefined;
      readonly hasNextPage: boolean;
    };
  };
};
export type ProfilePageRelayQuery = {
  response: ProfilePageRelayQuery$data;
  variables: ProfilePageRelayQuery$variables;
};

const node: ConcreteRequest = (function(){
var v0 = {
  "defaultValue": null,
  "kind": "LocalArgument",
  "name": "after"
},
v1 = {
  "defaultValue": null,
  "kind": "LocalArgument",
  "name": "first"
},
v2 = {
  "defaultValue": null,
  "kind": "LocalArgument",
  "name": "handle"
},
v3 = {
  "kind": "Variable",
  "name": "handle",
  "variableName": "handle"
},
v4 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "id",
  "storageKey": null
},
v5 = [
  {
    "alias": null,
    "args": [
      (v3/*: any*/)
    ],
    "concreteType": "PublicProfile",
    "kind": "LinkedField",
    "name": "profile",
    "plural": false,
    "selections": [
      (v4/*: any*/),
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
        "name": "profilePictureUrl",
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
        "name": "isFollowing",
        "storageKey": null
      }
    ],
    "storageKey": null
  },
  {
    "alias": null,
    "args": [
      {
        "kind": "Variable",
        "name": "cursor",
        "variableName": "after"
      },
      (v3/*: any*/),
      {
        "kind": "Variable",
        "name": "limit",
        "variableName": "first"
      }
    ],
    "concreteType": "PostConnection",
    "kind": "LinkedField",
    "name": "userPosts",
    "plural": false,
    "selections": [
      {
        "alias": null,
        "args": null,
        "concreteType": "PostEdge",
        "kind": "LinkedField",
        "name": "edges",
        "plural": true,
        "selections": [
          {
            "alias": null,
            "args": null,
            "kind": "ScalarField",
            "name": "cursor",
            "storageKey": null
          },
          {
            "alias": null,
            "args": null,
            "concreteType": "Post",
            "kind": "LinkedField",
            "name": "node",
            "plural": false,
            "selections": [
              (v4/*: any*/),
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
                "name": "thumbnailUrl",
                "storageKey": null
              },
              {
                "alias": null,
                "args": null,
                "kind": "ScalarField",
                "name": "likesCount",
                "storageKey": null
              },
              {
                "alias": null,
                "args": null,
                "kind": "ScalarField",
                "name": "commentsCount",
                "storageKey": null
              }
            ],
            "storageKey": null
          }
        ],
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "concreteType": "PageInfo",
        "kind": "LinkedField",
        "name": "pageInfo",
        "plural": false,
        "selections": [
          {
            "alias": null,
            "args": null,
            "kind": "ScalarField",
            "name": "hasNextPage",
            "storageKey": null
          },
          {
            "alias": null,
            "args": null,
            "kind": "ScalarField",
            "name": "endCursor",
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
    "argumentDefinitions": [
      (v0/*: any*/),
      (v1/*: any*/),
      (v2/*: any*/)
    ],
    "kind": "Fragment",
    "metadata": null,
    "name": "ProfilePageRelayQuery",
    "selections": (v5/*: any*/),
    "type": "Query",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": [
      (v2/*: any*/),
      (v1/*: any*/),
      (v0/*: any*/)
    ],
    "kind": "Operation",
    "name": "ProfilePageRelayQuery",
    "selections": (v5/*: any*/)
  },
  "params": {
    "cacheID": "fb9024b6299a258fdff4ea3ffe58c55e",
    "id": null,
    "metadata": {},
    "name": "ProfilePageRelayQuery",
    "operationKind": "query",
    "text": "query ProfilePageRelayQuery(\n  $handle: String!\n  $first: Int!\n  $after: String\n) {\n  profile(handle: $handle) {\n    id\n    handle\n    username\n    fullName\n    profilePictureUrl\n    bio\n    followersCount\n    followingCount\n    postsCount\n    isFollowing\n  }\n  userPosts(handle: $handle, limit: $first, cursor: $after) {\n    edges {\n      cursor\n      node {\n        id\n        imageUrl\n        thumbnailUrl\n        likesCount\n        commentsCount\n      }\n    }\n    pageInfo {\n      hasNextPage\n      endCursor\n    }\n  }\n}\n"
  }
};
})();

(node as any).hash = "6a9e6d76247d80956be0d2b6e18d097f";

export default node;
