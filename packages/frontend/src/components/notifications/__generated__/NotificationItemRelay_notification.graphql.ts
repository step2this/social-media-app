/**
 * @generated SignedSource<<21219cd3381fdc883257bbe5311f2dc9>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ReaderFragment } from 'relay-runtime';
export type NotificationStatus = "ARCHIVED" | "READ" | "UNREAD" | "%future added value";
export type NotificationType = "COMMENT" | "FOLLOW" | "LIKE" | "MENTION" | "SYSTEM" | "%future added value";
import { FragmentRefs } from "relay-runtime";
export type NotificationItemRelay_notification$data = {
  readonly actor: {
    readonly avatarUrl: string | null | undefined;
    readonly displayName: string | null | undefined;
    readonly handle: string;
    readonly userId: string;
  } | null | undefined;
  readonly createdAt: string;
  readonly id: string;
  readonly message: string;
  readonly status: NotificationStatus;
  readonly target: {
    readonly id: string;
    readonly preview: string | null | undefined;
    readonly type: string;
    readonly url: string | null | undefined;
  } | null | undefined;
  readonly title: string;
  readonly type: NotificationType;
  readonly " $fragmentType": "NotificationItemRelay_notification";
};
export type NotificationItemRelay_notification$key = {
  readonly " $data"?: NotificationItemRelay_notification$data;
  readonly " $fragmentSpreads": FragmentRefs<"NotificationItemRelay_notification">;
};

const node: ReaderFragment = (function(){
var v0 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "id",
  "storageKey": null
},
v1 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "type",
  "storageKey": null
};
return {
  "argumentDefinitions": [],
  "kind": "Fragment",
  "metadata": null,
  "name": "NotificationItemRelay_notification",
  "selections": [
    (v0/*: any*/),
    (v1/*: any*/),
    {
      "alias": null,
      "args": null,
      "kind": "ScalarField",
      "name": "title",
      "storageKey": null
    },
    {
      "alias": null,
      "args": null,
      "kind": "ScalarField",
      "name": "message",
      "storageKey": null
    },
    {
      "alias": null,
      "args": null,
      "kind": "ScalarField",
      "name": "status",
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
      "concreteType": "NotificationActor",
      "kind": "LinkedField",
      "name": "actor",
      "plural": false,
      "selections": [
        {
          "alias": null,
          "args": null,
          "kind": "ScalarField",
          "name": "userId",
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
          "name": "displayName",
          "storageKey": null
        },
        {
          "alias": null,
          "args": null,
          "kind": "ScalarField",
          "name": "avatarUrl",
          "storageKey": null
        }
      ],
      "storageKey": null
    },
    {
      "alias": null,
      "args": null,
      "concreteType": "NotificationTarget",
      "kind": "LinkedField",
      "name": "target",
      "plural": false,
      "selections": [
        (v1/*: any*/),
        (v0/*: any*/),
        {
          "alias": null,
          "args": null,
          "kind": "ScalarField",
          "name": "url",
          "storageKey": null
        },
        {
          "alias": null,
          "args": null,
          "kind": "ScalarField",
          "name": "preview",
          "storageKey": null
        }
      ],
      "storageKey": null
    }
  ],
  "type": "Notification",
  "abstractKey": null
};
})();

(node as any).hash = "4941e71287ecc9c698a04795cf6581cd";

export default node;
