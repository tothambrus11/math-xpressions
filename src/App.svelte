<script lang="ts">
    import {
        AdditionNode,
        ASTNode,
        BinaryConnectiveNode, DivisionNode, InvalidExpressionError,
        lex, MultiplicationNode,
        NumberConstantNode,
        parse, SubtractionNode,
        UnaryConnectiveNode, UnaryMinusNode,
        VariableNode
    } from "./parser";
    import {BinaryTreeNode, drawBinaryTree, setTheme} from 'binary-tree-visualizer';

    // Init a new root binary tree node
    let text = "-(a+b)⋅(10-3)";

    $: {
        let selectionPos = inputEl ? inputEl.selectionStart : text.length;
        let st = text.slice(0, selectionPos);
        let et = text.slice(selectionPos || text.length);

        if (st.endsWith('*')) {
            text = st.slice(0, -1) + '⋅' + et;

            setTimeout(() => {
                inputEl?.setSelectionRange(selectionPos, selectionPos);
            }, 0);
        }

    }

    $:{
        console.clear();
        let ast = parse(lex(text));

        console.log(ast)

        function traversePostfix(node: ASTNode): string {
            if (node instanceof BinaryConnectiveNode)
                return traversePostfix(node.childLeft) + traversePostfix(node.childRight) + node.toString() + ' ';
            if (node instanceof UnaryConnectiveNode)
                return traversePostfix(node.child) + node.toString() + ' ';
            if (node instanceof VariableNode) return node.toString() + ' ';
            if (node instanceof NumberConstantNode) return node.toString() + ' ';

            throw new InvalidExpressionError();
        }

        try {
            postfixNotation = traversePostfix(ast).trimEnd();
        } catch (e) {
            postfixNotation = "Invalid Expression";
        }

        function traversePrefix(node: ASTNode): string {
            if (node instanceof BinaryConnectiveNode)
                return ' ' + node.toString() + traversePrefix(node.childLeft) + traversePrefix(node.childRight);
            if (node instanceof UnaryConnectiveNode)
                return ' ' + node.toString() + traversePrefix(node.child);
            if (node instanceof VariableNode)
                return ' ' + node.toString();
            if (node instanceof NumberConstantNode)
                return ' ' + node.toString();

            throw new InvalidExpressionError();
        }

        try {
            prefixNotation = traversePrefix(ast).trimStart();
        } catch (e) {
            prefixNotation = "Invalid Expression";
        }


        function traverseAssembly(node: ASTNode): string {
            if (node instanceof BinaryConnectiveNode) {
                let result = traverseAssembly(node.childLeft) + traverseAssembly(node.childRight);
                if (node instanceof AdditionNode) {
                    result += 'ADDQ\n';
                } else if (node instanceof SubtractionNode) {
                    result += 'SUBQ\n';
                } else if (node instanceof MultiplicationNode) {
                    result += 'MULQ\n';
                } else if (node instanceof DivisionNode) {
                    result += 'DIVQ\n';
                } else {
                    throw new InvalidExpressionError();
                }
                return result;
            }
            if (node instanceof UnaryConnectiveNode) {
                if (node instanceof UnaryMinusNode)
                    return "PUSHQ $0\n" + traverseAssembly(node.child) + "SUBQ\n";

            }
            if (node instanceof VariableNode || node instanceof NumberConstantNode) return `PUSHQ $${node.toString()}\n`;

            throw new InvalidExpressionError();
        }

        try {
            assemblyZeroAddress = traverseAssembly(ast);
        } catch (e) {
            assemblyZeroAddress = "Invalid Expression";
        }

        function traverseStefanOrder(node: ASTNode): string {
            if (node instanceof BinaryConnectiveNode)
                return traversePostfix(node.childRight) + traversePostfix(node.childLeft) + node.toString() + ' ';
            if (node instanceof UnaryConnectiveNode)
                return traversePostfix(node.child) + node.toString() + ' ';
            if (node instanceof VariableNode) return node.toString() + ' ';
            if (node instanceof NumberConstantNode) return node.toString() + ' ';

            throw new InvalidExpressionError();
        }

        try {
            stefanNotation = traverseStefanOrder(ast).trimEnd();
        } catch (e) {
            stefanNotation = "Invalid Expression";
        }

        if (canvasEl) drawTree(ast)
    }

    function traverse(node: ASTNode, dnode: BinaryTreeNode) {
        if (!node) throw new InvalidExpressionError();

        if (node instanceof BinaryConnectiveNode) {
            dnode.left = node.childLeft ? traverse(node.childLeft, new BinaryTreeNode(node.childLeft.toString())) : new BinaryTreeNode('?');
            dnode.right = node.childRight ? traverse(node.childRight, new BinaryTreeNode(node.childRight.toString())) : new BinaryTreeNode('?');
        } else if (node instanceof UnaryConnectiveNode) {
            dnode.left = node.child ? traverse(node.child, new BinaryTreeNode((node.child || '?').toString())) : new BinaryTreeNode('?');
        }
        return dnode;
    }

    // Dark theme
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        setTheme({
            colorArray: [{
                borderColor: '#999',
                bgColor: '#333  ',
            }],
            strokeColor: '#999',
            fontSize: 16,
        });
    } else {
        setTheme({
            colorArray: [{
                borderColor: '#497843',
                bgColor: '#e4f3e2',
            }],
            strokeColor: '#497843',
            fontSize: 16
        });
    }


    function drawTree(root: ASTNode) {
        try {
            let tree = traverse(root, new BinaryTreeNode(root.toString()));

            drawBinaryTree(tree, canvasEl, {
                maxHeight: 500
            });
        } catch (e) {
            console.error(e)
        }
    }

    let postfixNotation = "";
    let prefixNotation = "";
    let stefanNotation = "";

    let inputEl: HTMLInputElement;
    let canvasEl: HTMLCanvasElement;
    let assemblyZeroAddress = "";

</script>

<h1>Math Expression Parser</h1>
<div id="header" style="display: flex; gap: 8px; flex-wrap: wrap">
    Infix notation: <input bind:value={text} bind:this={inputEl}/>
</div>

<div>Prefix notation:
    <pre style="display: inline-block">{prefixNotation}</pre>
</div>
<div>Postfix notation:
    <pre style="display: inline-block">{postfixNotation}</pre>
</div>
<div>Stefan notation<a href="#stefan">*</a>:
    <pre style="display: inline-block">{stefanNotation}</pre>
</div>

<canvas bind:this={canvasEl} style="max-width: 100%; box-sizing: border-box"></canvas>

<div>Assembly code with zero address instructions:</div>
<pre>{assemblyZeroAddress}</pre>
<div class="container">
    <h3>How to use?</h3>
    <p>Supported operators: +, - (binary), − (unary), * /</p>
    <p>You can enter variables and numbers. Implicit multiplication is not yet implemented (like 3y).</p>
    <p>Feature requests are welcomed at <a href="mailto:ambrus@johetajava.hu">ambrus@johetajava.hu</a> or through github
        issues.</p>
</div>

<div class="container">
    <h3>Notes</h3>
    <p id="stefan">Stefan notation is a notation where the operator is written after the operands and we traverse the
        right operand first. For example, 3 + 4 is
        written as 4 3 +.</p>
</div>

<footer style="margin-top: 64px">
    &copy; 2022 Ambrus Tóth<br>
    <a href="https://github.com/tothambrus11/math-xpressions" style="color: #1f5219">Source Code on Github</a>
</footer>

<style>
  input {
    padding: 5px 10px;
    font-size: 1.2em;
    font-family: inherit;
    border: none;
    border-bottom: 2px solid var(--border-color);
    outline: none;
    background-color: var(--input-bg);
  }

  input:focus {
    border-bottom-color: var(--border-color-focused);
  }


  #header {
    display: flex;
    margin-bottom: 16px;
    align-items: center;
  }

  .container {
    padding: 16px 32px;
    margin: 32px 0;
    border: 1px solid var(--secondary-text);
    color: var(--secondary-text);
  }
</style>