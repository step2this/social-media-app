/**
 * @generated SignedSource<<fb67d121b369967fa171fea0bc95fd1e>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ReaderFragment } from 'relay-runtime';
export type NotificationType = "COMMENT" | "FOLLOW" | "LIKE" | "MENTION" | "SYSTEM" | "%future added value";
import { FragmentRefs } from "relay-runtime";
export type NotificationsPage_notifications$data = {
  readonly notifications: {
    readonly edges: ReadonlyArray<{
      readonly cursor: string;
      readonly node: {
        readonly actor: {
          readonly avatarUrl: string | null | undefined;
          readonly handle: string;
          readonly userId: string;
        } | null | undefined;
        readonly createdAt: string;
        readonly id: string;
        readonly message: string;
        readonly readAt: string | null | undefined;
        readonly title: string;
        readonly type: NotificationType;
      };
    }>;
    readonly pageInfo: {
      readonly endCursor: string | null | undefined;
      readonly hasNextPage: boolean;
    };
  };
  readonly " $fragmentType": "NotificationsPage_notifications";
};
export type NotificationsPage_notifications$key = {
  readonly " $data"?: NotificationsPage_notifications$data;
  readonly " $fragmentSpreads": FragmentRefs<"NotificationsPage_notifications">;
};

import NotificationsPageNotificationsPaginationQuery_graphql from './NotificationsPageNotificationsPaginationQuery.graphql';

const node: ReaderFragment = {
  "argumentDefinitions": [
    {
      "defaultValue": null,
      "kind": "LocalArgument",
      "name": "cursor"
    },
    {
      "defaultValue": 20,
      "kind": "LocalArgument",
      "name": "limit"
    }
  ],
  "kind": "Fragment",
  "metadata": {
    "refetch": {
      "connection": null,
      "fragmentPathInResult": [],
      "operation": NotificationsPageNotificationsPaginationQuery_graphql
    }
  },
  "name": "NotificationsPage_notifications",
  "selections": [
    {
      "alias": null,
      "args": [
        {
          "kind": "Variable",
          "name": "cursor",
          "variableName": "cursor"
        },
        {
          "kind": "Variable",
          "name": "limit",
          "variableName": "limit"
        }
      ],
      "concreteType": "NotificationConnection",
      "kind": "LinkedField",
      "name": "notifications",
      "plural": false,
      "selections": [
        {
          "alias": null,
          "args": null,
          "concreteType": "NotificationEdge",
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
              "concreteType": "Notification",
              "kind": "LinkedField",
              "name": "node",
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
                  "name": "type",
                  "storageKey": null
                },
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
                  "name": "createdAt",
                  "storageKey": null
                },
                {
                  "alias": null,
                  "args": null,
                  "kind": "ScalarField",
                  "name": "readAt",
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
                      "name": "avatarUrl",
                      "storageKey": null
                    }
                  ],
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
  ],
  "type": "Query",
  "abstractKey": null
};

(node as any).hash = "b43e6fcde573a5bfd8704de82ae10d71";

export default node;
