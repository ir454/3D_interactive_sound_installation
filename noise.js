// Simple Perlin noise implementation (from josephg/noisejs)
var module = module || {};
(function(global){
  function Grad(x, y, z) { this.x = x; this.y = y; this.z = z; }
  Grad.prototype.dot2 = function(x, y) { return this.x*x + this.y*y; };
  var grad3 = [new Grad(1,1,0),new Grad(-1,1,0),new Grad(1,-1,0),new Grad(-1,-1,0),
               new Grad(1,0,1),new Grad(-1,0,1),new Grad(1,0,-1),new Grad(-1,0,-1),
               new Grad(0,1,1),new Grad(0,-1,1),new Grad(0,1,-1),new Grad(0,-1,-1)];
  var p = [];
  for (var i = 0; i < 256; i++) p[i] = Math.floor(Math.random() * 256);
  var perm = new Array(512);
  var gradP = new Array(512);

  var noise = {
    seed: function(seed) {
      if(seed > 0 && seed < 1) seed *= 65536;
      seed = Math.floor(seed);
      if(seed < 256) seed |= seed << 8;
      for (var i = 0; i < 256; i++) {
        var v = (i & 1) ? p[i] ^ (seed & 255) : p[i] ^ ((seed>>8) & 255);
        perm[i] = perm[i + 256] = v;
        gradP[i] = gradP[i + 256] = grad3[v % 12];
      }
    },
    perlin2: function(x, y) {
      var X = Math.floor(x), Y = Math.floor(y);
      x = x - X; y = y - Y;
      X = X & 255; Y = Y & 255;
      var n00 = gradP[X+perm[Y]].dot2(x, y);
      var n01 = gradP[X+perm[Y+1]].dot2(x, y-1);
      var n10 = gradP[X+1+perm[Y]].dot2(x-1, y);
      var n11 = gradP[X+1+perm[Y+1]].dot2(x-1, y-1);
      var u = fade(x);
      var v = fade(y);
      return lerp(
        lerp(n00, n10, u),
        lerp(n01, n11, u),
        v);
    }
  };
  function fade(t) { return t*t*t*(t*(t*6-15)+10); }
  function lerp(a, b, t) { return (1-t)*a + t*b; }
  global.noise = noise;
})(this);
