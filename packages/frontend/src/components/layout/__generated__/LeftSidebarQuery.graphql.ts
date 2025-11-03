/**
 * @generated SignedSource<<773b20c53ad77160f8c1dc40522298b6>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type LeftSidebarQuery$variables = Record<PropertyKey, never>;
export type LeftSidebarQuery$data = {
  readonly unreadNotificationsCount: number;
};
export type LeftSidebarQuery = {
  response: LeftSidebarQuery$data;
  variables: LeftSidebarQuery$variables;
};

const node: ConcreteRequest = (function(){
var v0 = [
  {
    "alias": null,
    "args": null,
    "kind": "ScalarField",
    "name": "unreadNotificationsCount",
    "storageKey": null
  }
];
return {
  "fragment": {
    "argumentDefinitions": [],
    "kind": "Fragment",
    "metadata": null,
    "name": "LeftSidebarQuery",
    "selections": (v0/*: any*/),
    "type": "Query",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": [],
    "kind": "Operation",
    "name": "LeftSidebarQuery",
    "selections": (v0/*: any*/)
  },
  "params": {
    "cacheID": "4ad82012172020294bf885798a7d5961",
    "id": null,
    "metadata": {},
    "name": "LeftSidebarQuery",
    "operationKind": "query",
    "text": "query LeftSidebarQuery {\n  unreadNotificationsCount\n}\n"
  }
};
})();

(node as any).hash = "3fa92492b05a35addb1d531bd98282dd";

export default node;
