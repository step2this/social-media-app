/**
 * @generated SignedSource<<b5829936edc0118bc888f4fc7eff7850>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type CommentItemDeleteMutation$variables = {
  id: string;
};
export type CommentItemDeleteMutation$data = {
  readonly deleteComment: {
    readonly success: boolean;
  };
};
export type CommentItemDeleteMutation = {
  response: CommentItemDeleteMutation$data;
  variables: CommentItemDeleteMutation$variables;
};

const node: ConcreteRequest = (function(){
var v0 = [
  {
    "defaultValue": null,
    "kind": "LocalArgument",
    "name": "id"
  }
],
v1 = [
  {
    "alias": null,
    "args": [
      {
        "kind": "Variable",
        "name": "id",
        "variableName": "id"
      }
    ],
    "concreteType": "DeleteResponse",
    "kind": "LinkedField",
    "name": "deleteComment",
    "plural": false,
    "selections": [
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "success",
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
    "name": "CommentItemDeleteMutation",
    "selections": (v1/*: any*/),
    "type": "Mutation",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Operation",
    "name": "CommentItemDeleteMutation",
    "selections": (v1/*: any*/)
  },
  "params": {
    "cacheID": "c77040f9a419de96e9cd78f80c4e5400",
    "id": null,
    "metadata": {},
    "name": "CommentItemDeleteMutation",
    "operationKind": "mutation",
    "text": "mutation CommentItemDeleteMutation(\n  $id: ID!\n) {\n  deleteComment(id: $id) {\n    success\n  }\n}\n"
  }
};
})();

(node as any).hash = "6c4e05e365c9e07039a5070f4f9b19d3";

export default node;
