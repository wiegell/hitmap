import { quadtree } from "d3-quadtree";

// @ts-expect-error
function x(d) {
  return d.x + d.vx;
}

// @ts-expect-error
function y(d) {
  return d.y + d.vy;
}

// @ts-expect-error
export function vendorCollide(radius, sameVendorRadius) {
  // @ts-expect-error
  var nodes,
    // @ts-expect-error
    radii,
    // @ts-expect-error
    random,
    strength = 1,
    iterations = 1;

  if (typeof radius !== "function")
    radius = constant(radius == null ? 1 : +radius);

  function force() {
    var i,
      // @ts-expect-error
      n = nodes.length,
      tree,
      // @ts-expect-error
      node,
      // @ts-expect-error
      xi,
      // @ts-expect-error
      yi,
      // @ts-expect-error
      ri,
      // @ts-expect-error
      ri2;

    for (var k = 0; k < iterations; ++k) {
      // @ts-expect-error
      tree = quadtree(nodes, x, y).visitAfter(prepare);
      // @ts-expect-error
      for (i = 0; i < n; ++i) {
        // @ts-expect-error
        node = nodes[i];
        // @ts-expect-error
        (ri = radii[node.index]), (ri2 = ri * ri);
        xi = node.x + node.vx;
        yi = node.y + node.vy;
        tree.visit(apply);
      }
    }

    // @ts-expect-error
    function apply(quad, x0, y0, x1, y1) {
      var data = quad.data,
        rj = quad.r,
        // @ts-expect-error
        r = ri + rj;
      if (data) {
        // @ts-expect-error
        if (data.index > node.index) {
          // @ts-expect-error
          var x = xi - data.x - data.vx,
            // @ts-expect-error
            y = yi - data.y - data.vy,
            l = x * x + y * y;

          // @ts-expect-error
          if (node.vendor === data.vendor) {
            r = sameVendorRadius + rj;
          }

          if (l < r * r) {
            // @ts-expect-error
            if (x === 0) (x = jiggle(random)), (l += x * x);
            // @ts-expect-error
            if (y === 0) (y = jiggle(random)), (l += y * y);
            l = ((r - (l = Math.sqrt(l))) / l) * strength;
            // @ts-expect-error
            node.vx += (x *= l) * (r = (rj *= rj) / (ri2 + rj));
            // @ts-expect-error
            node.vy += (y *= l) * r;
            data.vx -= x * (r = 1 - r);
            data.vy -= y * r;
          }
        }
        return;
      }
      // @ts-expect-error
      return x0 > xi + r || x1 < xi - r || y0 > yi + r || y1 < yi - r;
    }
  }

  // @ts-expect-error
  function prepare(quad) {
    // @ts-expect-error
    if (quad.data) return (quad.r = radii[quad.data.index]);
    for (var i = (quad.r = 0); i < 4; ++i) {
      if (quad[i] && quad[i].r > quad.r) {
        quad.r = quad[i].r;
      }
    }
  }

  function initialize() {
    // @ts-expect-error
    if (!nodes) return;
    var i,
      n = nodes.length,
      node;
    radii = new Array(n);
    for (i = 0; i < n; ++i)
      (node = nodes[i]), (radii[node.index] = +radius(node, i, nodes));
  }

  // @ts-expect-error
  force.initialize = function (_nodes, _random) {
    nodes = _nodes;
    random = _random;
    initialize();
  };

  // @ts-expect-error
  force.iterations = function (_) {
    return arguments.length ? ((iterations = +_), force) : iterations;
  };

  // @ts-expect-error
  force.strength = function (_) {
    return arguments.length ? ((strength = +_), force) : strength;
  };

  // @ts-expect-error
  force.radius = function (_) {
    return arguments.length
      ? ((radius = typeof _ === "function" ? _ : constant(+_)),
        initialize(),
        force)
      : radius;
  };

  return force;
}

// @ts-expect-error
function jiggle(random) {
  return (random() - 0.5) * 1e-6;
}

// @ts-expect-error
function constant(x) {
  return function () {
    return x;
  };
}
