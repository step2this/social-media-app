/**
 * @generated SignedSource<<cec84161faefcd7c17d88f55ca782b9f>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ReaderFragment } from 'relay-runtime';
import { FragmentRefs } from "relay-runtime";
export type FeedItemWrapper_post$data = {
  readonly id: string;
  readonly " $fragmentSpreads": FragmentRefs<"PostCardRelay_post">;
  readonly " $fragmentType": "FeedItemWrapper_post";
};
export type FeedItemWrapper_post$key = {
  readonly " $data"?: FeedItemWrapper_post$data;
  readonly " $fragmentSpreads": FragmentRefs<"FeedItemWrapper_post">;
};

const node: ReaderFragment = {
  "argumentDefinitions": [],
  "kind": "Fragment",
  "metadata": null,
  "name": "FeedItemWrapper_post",
  "selections": [
    {
      "alias": null,
      "args": null,
      "kind": "ScalarField",
      "name": "id",
      "storageKey": null
    },
    {
      "args": null,
      "kind": "FragmentSpread",
      "name": "PostCardRelay_post"
    }
  ],
  "type": "Post",
  "abstractKey": null
};

(node as any).hash = "588e0fe0cdc77ec7c6c8639a4c77348d";

export default node;
