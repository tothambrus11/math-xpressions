export enum TokenType {
    Variable,
    NumberConstant,
    UnaryOperator,
    BinaryOperator,
    LParenthesis,
    RParenthesis
}

export interface TokenBase {
    tokenType: TokenType;
}

export interface Variable extends TokenBase {
    tokenType: TokenType.Variable;
    name: string;
}

export interface UnaryConnective extends TokenBase {
    tokenType: TokenType.UnaryOperator;
    opType: OperatorType;
}

export interface BinaryConnective extends TokenBase {
    tokenType: TokenType.BinaryOperator;
    opType: OperatorType;
}

export interface NumberConstant extends TokenBase {
    tokenType: TokenType.NumberConstant;
    value: number;
}

export enum OperatorType {
    UnaryMinus,
    Multiplication,
    Addition,
    Subtraction,
    Division,
}

const precedences = {
    [OperatorType.UnaryMinus]: 1,
    [OperatorType.Multiplication]: 2,
    [OperatorType.Division]: 2,
    [OperatorType.Addition]: 3,
    [OperatorType.Subtraction]: 3,
};

export type Token = BinaryConnective | UnaryConnective | TokenBase | Variable | NumberConstant;
export type OperatorToken = UnaryConnective | BinaryConnective;

const unaryfierCharacters = ['(', '*', '+', '/', '-'];

export function lex(text: string): Token[] {
    text = text.replaceAll(' ', '');
    let list: Token[] = [];
    for (let i = 0; i < text.length; i++) {
        let c = text.charAt(i);
        switch (c) {
            case '+':
                list.push({tokenType: TokenType.BinaryOperator, opType: OperatorType.Addition});
                break;
            case '*':
            case '⋅':
                list.push({tokenType: TokenType.BinaryOperator, opType: OperatorType.Multiplication});
                break;
            case '/':
                list.push({tokenType: TokenType.BinaryOperator, opType: OperatorType.Division});
                break;
            case '-':
                if (i == 0 || unaryfierCharacters.includes(text.charAt(i - 1))) {
                    list.push({tokenType: TokenType.UnaryOperator, opType: OperatorType.UnaryMinus});
                } else {
                    list.push({tokenType: TokenType.BinaryOperator, opType: OperatorType.Subtraction});
                }
                break;
            case '(':
                list.push({tokenType: TokenType.LParenthesis});
                break;
            case ')':
                list.push({tokenType: TokenType.RParenthesis});
                break;
            case '0':
            case '1':
            case '2':
            case '3':
            case '4':
            case '5':
            case '6':
            case '7':
            case '8':
            case '9':
                let number = '';
                while (i < text.length && '0123456789'.includes(text.charAt(i))) {
                    number += text.charAt(i);
                    i++;
                }

                list.push({tokenType: TokenType.NumberConstant, value: parseInt(number)});
                i--;
                break;

            default:
                list.push({tokenType: TokenType.Variable, name: c});

        }
    }

    return list;
}

type Expression = (Token | Expression)[];

export function parse(tokens: Token[]): ASTNode {
    // Generate expressions:
    let expression = [];
    let currentExpression = expression;
    let expressionStack = [];
    expressionStack.push(currentExpression);
    tokens.forEach(token => {
        switch (token.tokenType) {
            case TokenType.LParenthesis:
                currentExpression.push([]);
                currentExpression = currentExpression[currentExpression.length - 1];
                expressionStack.push(currentExpression);
                break;
            case TokenType.RParenthesis:
                expressionStack.pop();
                currentExpression = expressionStack[expressionStack.length - 1];
                break;
            default:
                currentExpression.push(token);
        }
    });
    console.log(expression);

    return nodeifyExpression(expression, 0, expression.length);
}

function nodeifyExpression(expression: Expression, subExpStart: number, subExpEnd: number): ASTNode {
    let maxPrecedence = 0;
    let mostMainConnective: OperatorToken;
    let mostMainConnectiveIndex: number;

    for (let i = subExpStart; i < subExpEnd; i++) {
        let expItem = expression[i];
        if (!(expItem instanceof Array) && (expItem.tokenType === TokenType.UnaryOperator || expItem.tokenType === TokenType.BinaryOperator)) {
            if (precedences[(expItem as OperatorToken).opType] >= maxPrecedence) {
                maxPrecedence = precedences[(expItem as OperatorToken).opType];
                mostMainConnective = expItem as OperatorToken;
                mostMainConnectiveIndex = i;
            }
        }
    }
    if (!mostMainConnective) {
        if (subExpEnd - subExpStart == 1) {
            let expItem = expression[subExpStart];
            if (expItem instanceof Array) {
                return nodeifyExpression(expItem, 0, expItem.length);
            } else if ((expression[subExpStart] as Token).tokenType === TokenType.Variable) {
                return new VariableNode((expression[subExpStart] as Variable).name);
            } else if ((expression[subExpStart] as Token).tokenType === TokenType.NumberConstant) {
                return new NumberConstantNode((expression[subExpStart] as NumberConstant).value);
            }
        } else if (subExpEnd - subExpStart == 0) {
            return null;
        } else {
            return null;
        }
    }

    switch (mostMainConnective.opType) {
        case OperatorType.Multiplication:
            return new MultiplicationNode(
                nodeifyExpression(expression, subExpStart, mostMainConnectiveIndex),
                nodeifyExpression(expression, mostMainConnectiveIndex + 1, subExpEnd),
            );
        case OperatorType.Addition:
            return new AdditionNode(
                nodeifyExpression(expression, subExpStart, mostMainConnectiveIndex),
                nodeifyExpression(expression, mostMainConnectiveIndex + 1, subExpEnd),
            );
        case OperatorType.UnaryMinus:
            return new UnaryMinusNode(
                nodeifyExpression(expression, subExpStart + 1, subExpEnd)
            );
        case OperatorType.Subtraction:
            return new SubtractionNode(
                nodeifyExpression(expression, subExpStart, mostMainConnectiveIndex),
                nodeifyExpression(expression, mostMainConnectiveIndex + 1, subExpEnd)
            );
        case OperatorType.Division:
            return new DivisionNode(
                nodeifyExpression(expression, subExpStart, mostMainConnectiveIndex),
                nodeifyExpression(expression, mostMainConnectiveIndex + 1, subExpEnd)
            );
        default:
            throw new Error("wtf 222");
    }

}

export interface Variables {
    [key: string]: number;
}

export abstract class ASTNode {
    abstract result(vars: Variables): number;

    abstract toString(): string;
}

export abstract class UnaryConnectiveNode extends ASTNode {
    constructor(public child: ASTNode) {
        super();
    }
}

export abstract class BinaryConnectiveNode extends ASTNode {
    constructor(public childLeft: ASTNode,
                public childRight: ASTNode) {
        super();
    }
}

export class VariableNode extends ASTNode {
    constructor(public name: string) {
        super();
    }

    result(vars: Variables): number {
        return vars[this.name];
    }

    toString(): string {
        return this.name;
    }
}


export class NumberConstantNode extends ASTNode {
    constructor(public readonly number: number) {
        super();
    }

    result(vars: Variables): number {
        return this.number;
    }

    toString(): string {
        return '' + this.number
    }
}

export class InvalidExpressionError extends Error {

}

export class UnaryMinusNode extends UnaryConnectiveNode {
    result(vars: Variables): number {
        if (!this.child) throw new InvalidExpressionError();
        return -this.child.result(vars);
    }

    toString(): string {
        return '−';
    }
}

export class MultiplicationNode extends BinaryConnectiveNode {
    result(vars: Variables): number {
        if (!this.childLeft || !this.childRight) throw new InvalidExpressionError();
        return this.childLeft.result(vars) * this.childRight.result(vars);
    }

    toString(): string {
        return '⋅';
    }
}

export class DivisionNode extends BinaryConnectiveNode {
    result(vars: Variables): number {
        if (!this.childLeft || !this.childRight) throw new InvalidExpressionError();
        return this.childLeft.result(vars) / this.childRight.result(vars);
    }

    toString(): string {
        return '/';
    }
}

export class AdditionNode extends BinaryConnectiveNode {
    result(vars: Variables): number {
        if (!this.childLeft || !this.childRight) throw new InvalidExpressionError();
        return this.childLeft.result(vars) + this.childRight.result(vars);
    }

    toString(): string {
        return '+';
    }
}

export class SubtractionNode extends BinaryConnectiveNode {
    result(vars: Variables): number {
        if (!this.childLeft || !this.childRight) throw new InvalidExpressionError();
        return this.childLeft.result(vars) - this.childRight.result(vars);
    }

    toString(): string {
        return '-';
    }
}
