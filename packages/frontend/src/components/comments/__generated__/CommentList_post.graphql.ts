/**
 * @generated SignedSource<<fbf8620435bcb859d121186a94e1fd9f>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ReaderFragment } from 'relay-runtime';
import { FragmentRefs } from "relay-runtime";
export type CommentList_post$data = {
  readonly comments: {
    readonly edges: ReadonlyArray<{
      readonly node: {
        readonly id: string;
        readonly " $fragmentSpreads": FragmentRefs<"CommentItem_comment">;
      };
    }>;
  };
  readonly id: string;
  readonly " $fragmentType": "CommentList_post";
};
export type CommentList_post$key = {
  readonly " $data"?: CommentList_post$data;
  readonly " $fragmentSpreads": FragmentRefs<"CommentList_post">;
};

const node: ReaderFragment = (function(){
var v0 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "id",
  "storageKey": null
};
return {
  "argumentDefinitions": [],
  "kind": "Fragment",
  "metadata": null,
  "name": "CommentList_post",
  "selections": [
    (v0/*: any*/),
    {
      "alias": null,
      "args": [
        {
          "kind": "Literal",
          "name": "first",
          "value": 20
        }
      ],
      "concreteType": "CommentConnection",
      "kind": "LinkedField",
      "name": "comments",
      "plural": false,
      "selections": [
        {
          "alias": null,
          "args": null,
          "concreteType": "CommentEdge",
          "kind": "LinkedField",
          "name": "edges",
          "plural": true,
          "selections": [
            {
              "alias": null,
              "args": null,
              "concreteType": "Comment",
              "kind": "LinkedField",
              "name": "node",
              "plural": false,
              "selections": [
                (v0/*: any*/),
                {
                  "args": null,
                  "kind": "FragmentSpread",
                  "name": "CommentItem_comment"
                }
              ],
              "storageKey": null
            }
          ],
          "storageKey": null
        }
      ],
      "storageKey": "comments(first:20)"
    }
  ],
  "type": "Post",
  "abstractKey": null
};
})();

(node as any).hash = "15755241139045f04a2512ff3af9a286";

export default node;
