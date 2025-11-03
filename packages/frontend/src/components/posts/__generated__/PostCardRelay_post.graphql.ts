/**
 * @generated SignedSource<<18ded70fe7672335c4b3127e1188ede8>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ReaderFragment } from 'relay-runtime';
import { FragmentRefs } from "relay-runtime";
export type PostCardRelay_post$data = {
  readonly caption: string | null | undefined;
  readonly commentsCount: number;
  readonly createdAt: string;
  readonly id: string;
  readonly imageUrl: string;
  readonly isLiked: boolean | null | undefined;
  readonly likesCount: number;
  readonly userHandle: {
    readonly handle: string;
    readonly username: string;
  };
  readonly userId: string;
  readonly " $fragmentSpreads": FragmentRefs<"CommentList_post">;
  readonly " $fragmentType": "PostCardRelay_post";
};
export type PostCardRelay_post$key = {
  readonly " $data"?: PostCardRelay_post$data;
  readonly " $fragmentSpreads": FragmentRefs<"PostCardRelay_post">;
};

const node: ReaderFragment = {
  "argumentDefinitions": [],
  "kind": "Fragment",
  "metadata": null,
  "name": "PostCardRelay_post",
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
      "alias": "userHandle",
      "args": null,
      "concreteType": "PublicProfile",
      "kind": "LinkedField",
      "name": "author",
      "plural": false,
      "selections": [
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
        }
      ],
      "storageKey": null
    },
    {
      "alias": null,
      "args": null,
      "kind": "ScalarField",
      "name": "caption",
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
      "name": "likesCount",
      "storageKey": null
    },
    {
      "alias": null,
      "args": null,
      "kind": "ScalarField",
      "name": "isLiked",
      "storageKey": null
    },
    {
      "alias": null,
      "args": null,
      "kind": "ScalarField",
      "name": "commentsCount",
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
      "args": null,
      "kind": "FragmentSpread",
      "name": "CommentList_post"
    }
  ],
  "type": "Post",
  "abstractKey": null
};

(node as any).hash = "e62a9bda20dad76492421fcb26b828aa";

export default node;
