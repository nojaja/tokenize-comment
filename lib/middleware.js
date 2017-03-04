'use strict';

var define = require('define-property');
var each = require('array-each');

module.exports = function(options, tok) {
  return function(parser) {
    var type = 'description';
    var footer = 0;
    var stack = [];
    var prev = {};
    var prevType;

    function last(arr) {
      return arr[arr.length - 1];
    }

    function append(arr, prop, str) {
      last(arr)[prop] += str;
    }

    function update(node) {
      if (type === 'description') {
        if (stack.length === 0 || prevType === 'break' || prev.isExample === true) {
          stack.push(node);
        } else {
          append(stack, 'val', node.val);
        }

      } else if (type === 'example' && prev.type === 'description' && stack.length > 1) {
        node.description += stack.pop().val;
        footer = stack.length;

      } else if (stack.length && (type === 'newline' || type === 'break')) {
        if (prev.isExample === true) {
          prev.description += node.val;
        } else {
          append(stack, 'val', node.val);
        }

      } else if (!stack.length) {
        tok.description += node.val;

      } else {
        footer = stack.length;
      }
    }

    parser.on('node', function(node) {
      type = node.type;

      switch (type) {
        case 'gfm':
        case 'javadoc':
        case 'indented':
        case 'example':
          if (prev.type === 'tag') {
            prev.val += node.val;
            break;
          }
          type = 'example';
          update(node);
          tok.examples.push(node);
          prev = node;
          define(prev, 'isExample', true);
          break;
        case 'tag':
          tok[type + 's'].push(node);
          prev = node;
          break;
        case 'description':
          // if "node.key" exists it's a "@description"
          if (prev.type === 'tag' && !node.key) {
            prev.val += node.val;
            break;
          }

          update(node);
          prev = node;
          break;
        case 'newline':
        default: {
          if (prev.type === 'tag') {
            prev.val += node.val;
            break;
          }
          update(node);
          break;
        }
      }
      prevType = type;
    });

    parser
      .set('break', function() {
        var pos = this.position();
        var match = this.match(/^\n{2,}/);
        if (match) {
          return pos(this.node({
            type: 'break',
            val: match[0]
          }));
        }
      })

      .set('newline', function() {
        var pos = this.position();
        var match = this.match(/^\n/);
        if (match) {
          return pos(this.node({
            type: 'newline',
            val: match[0]
          }));
        }
      })

      .set('gfm', function() {
        var pos = this.position();
        var match = this.match(/^([^\S\n]*)(`{3,4})(.*)/);
        if (match) {
          var node = pos(this.node({
            type: 'gfm',
            val: match[0],
            description: '',
            language: match[3] || '',
            code: ''
          }));

          var idx = this.input.indexOf('```');
          if (idx === -1) {
            throw new Error('missing closing "```"');
          }

          node.val += this.input.slice(0, idx + match[2].length);
          node.code += this.input.slice(0, idx);
          this.input = this.input.slice(idx + 3);

          if (match[1]) {
            var len = match[1].length;
            node.code = node.code.split('\n').map(function(ele) {
              return ele.slice(len);
            }).join('\n');
          }

          return node;
        }
      })

      .set('indented', function() {
        var pos = this.position();
        var match = this.match(/^ {4}([^\n]*\n?)/);
        if (match) {
          var node = pos(this.node({
            type: 'indented',
            val: match[0],
            description: '',
            language: '',
            code: match[1]
          }));

          var lines = this.input.split('\n');
          var i = 0;
          var line = lines[0];
          var len = 0;

          while (line && line.slice(0, 4) === '    ') {
            node.code += line.slice(4) + '\n';
            node.val += line + '\n';
            len += line.length + 1;
            line = lines[++i];
          }

          this.input = this.input.slice(len);
          return node;
        }
      })

      .set('javadoc', function() {
        var pos = this.position();
        var match = this.match(/^@example *([^\n]*\n?)/);
        if (match) {
          var node = pos(this.node({
            type: 'javadoc',
            val: match[0],
            description: '',
            language: '',
            code: match[1]
          }));

          var lines = this.input.split('\n');
          var line = lines[0];
          var len = 0;
          var i = 0;

          if (!/^(?:\s*@\S|`{3,4})/gm.test(this.input)) {
            node.val += this.input;
            node.code += this.input;
            this.input = '';
            return node;
          }

          while (line && line.charAt(0) !== '@') {
            node.code += line + '\n';
            node.val += line + '\n';
            len += line.length + 1;
            line = lines[++i];
          }

          this.input = this.input.slice(len);
          return node;
        }
      })

      .set('tags', function() {
        var pos = this.position();
        var match = this.match(/^ {0,3}@(?!example)(\S+) *([^\n]*)/);
        if (match) {
          var name = match[1] === 'description' ? match[1] : 'tag';
          return pos(this.node({
            type: name,
            raw: match[0],
            key: match[1],
            val: match[2]
          }));
        }
      })

      .set('description', function() {
        var pos = this.position();
        var match = this.match(/^ *(?!@|```| {4})[^\n]+/);
        if (match) {
          return pos(this.node({
            type: 'description',
            val: match[0]
          }));
        }
      })

      .set('eos', function() {
        if (footer && stack.length > 1 && footer < stack.length) {
          each(stack.slice(footer), function(node) {
            tok.footer += node.val;
          });
          stack = stack.slice(0, footer);
        }

        each(stack, function(node) {
          tok.description += node.val;
        });

        tok.description = tok.description.trim();
        tok.footer = tok.footer.trim();

        each(tok.examples, function(example) {
          example.description = example.description.trim();
        });

        each(tok.tags, function(tag) {
          tag.raw = tag.raw.trim();
          tag.val = tag.val.trim();
        });
      });

  };
};