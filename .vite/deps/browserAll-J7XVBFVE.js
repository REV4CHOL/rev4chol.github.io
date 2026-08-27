import {
  AccessibilitySystem,
  DOMPipe,
  EventSystem,
  FederatedContainer,
  accessibilityTarget
} from "./chunk-S7GKNVR2.js";
import "./chunk-UJSQU3NN.js";
import "./chunk-O4BZS54E.js";
import "./chunk-VZEMK4V7.js";
import "./chunk-F43JBXRD.js";
import "./chunk-IN5D7ATT.js";
import {
  Container
} from "./chunk-R6GXRNOM.js";
import {
  extensions
} from "./chunk-UHNSSXB2.js";
import "./chunk-YLJ4XMA6.js";

// node_modules/pixi.js/lib/accessibility/init.mjs
extensions.add(AccessibilitySystem);
extensions.mixin(Container, accessibilityTarget);

// node_modules/pixi.js/lib/dom/init.mjs
extensions.add(DOMPipe);

// node_modules/pixi.js/lib/events/init.mjs
extensions.add(EventSystem);
extensions.mixin(Container, FederatedContainer);
//# sourceMappingURL=browserAll-J7XVBFVE.js.map
