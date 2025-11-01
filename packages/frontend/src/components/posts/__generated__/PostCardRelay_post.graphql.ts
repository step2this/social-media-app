/**
 * @generated SignedSource<<68b890202de6662fad282dd715522b20>>
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
    }
  ],
  "type": "Post",
  "abstractKey": null
};

(node as any).hash = "32ca2b090d9edaaefc5b4078f9f07099";

export default node;
