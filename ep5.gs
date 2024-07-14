// Some stuffs
const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("IDE")

const TT_INT = "INT"
const TT_FLOAT = "FLOAT"
const TT_IDENTIFIER = "IDENTIFIER"
const TT_KEYWORD = "KEYWORD"
const TT_PLUS = "PLUS"
const TT_MINUS = "MINUS"
const TT_MUL = "MUL"
const TT_DIV = "DIV"
const TT_POW = "POW"
const TT_EQ = "EQ"
const TT_EE = "EE"
const TT_NE = "NE"
const TT_GT = "GT"
const TT_LT = "LT"
const TT_GTE = "GTE"
const TT_LTE = "LTE"
const TT_LPAREN = "LPAREN"
const TT_RPAREN = "RPAREN"
const TT_EOF = "EOF"

const DIGITS = "0123456789"
const LETTERS = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ"
const LETTERS_DIGITS = `${DIGITS}${LETTERS}`

const KEYWORDS = ["var", "and", "or", "not"]

// Errors
class Error_ {
  constructor(pos_start, pos_end, error_name, details) {
    this.pos_start = pos_start
    this.pos_end = pos_end
    this.error_name = error_name
    this.details = details
    this.as_string = `File ${pos_start.fn}, line ${pos_start.line + 1}\n${this.error_name}: ${this.details}`
  }
}

class IllegalCharError extends Error_ {
  constructor(pos_start, pos_end, details) {
    super(pos_start, pos_end, "Illegal Character", details)
  }
}

class InvalidSyntaxError extends Error_ {
  constructor(pos_start, pos_end, details) {
    super(pos_start, pos_end, "Invalid Syntax", details)
  }
}

class ExpectedCharacterError extends Error_ {
  constructor(pos_start, pos_end, details) {
    super(pos_start, pos_end, "Expected Character", details)
  }
}

class RunTimeError extends Error_ {
  constructor(pos_start, pos_end, details, context) {
    super(pos_start, pos_end, "Runtime Error", details)
    this.context = context
    this.as_string = `${this.generate_traceback()}${this.error_name}: ${this.details}`
  }

  generate_traceback() {
    let result = ""
    let position = this.pos_start
    let context = this.context
    while (context !== null) {
      result = `File ${position.fn}, line ${position.line + 1}, in ${context.display_name}\n${result}`
      position = context.parent_entry_position
      context = context.parent
    }
    return `Traceback (most recent call last):\n${result}`
  }
}

// Lexer
class Lexer {
  constructor(fn, text) {
    this.text = text
    this.pos = new Position(-1, 0, -1, fn, text)
    this.advance.call(this)
  }

  advance() {
    this.pos.advance(this.current_char)
    this.current_char = this.text[this.pos.index] // Returns undefined if overflow
  }

  make_tokens() {
    let token = null
    let error = null
    let tokens = []
    let overall = null
    while (this.current_char !== undefined) {
      if (" \t".includes(this.current_char)) {
        this.advance.call(this)
      } else if (DIGITS.includes(this.current_char)) {
        tokens.push(this.make_number.call(this))
      } else if (LETTERS.includes(this.current_char)) {
        tokens.push(this.make_identifier.call(this))
      } else {
        switch (this.current_char) {
          case "+":
            token = new Token(TT_PLUS, null, this.pos)
            tokens.push(token)
            this.advance.call(this)
            break
          case "-":
            token = new Token(TT_MINUS, null, this.pos)
            tokens.push(token)
            this.advance.call(this)
            break
          case "*":
            token = new Token(TT_MUL, null, this.pos)
            tokens.push(token)
            this.advance.call(this)
            break
          case "/":
            token = new Token(TT_DIV, null, this.pos)
            tokens.push(token)
            this.advance.call(this)
            break
          case "^":
            token = new Token(TT_POW, null, this.pos)
            tokens.push(token)
            this.advance.call(this)
            break
          case "=":
            token = this.make_equals()
            tokens.push(token)
            break
          case "(":
            token = new Token(TT_LPAREN, null, this.pos)
            tokens.push(token)
            this.advance.call(this)
            break
          case ")":
            token = new Token(TT_RPAREN, null, this.pos)
            tokens.push(token)
            this.advance.call(this)
            break
          case "!":
            overall = this.make_not_equals()
            token = overall.token
            error = overall.error
            if (error !== null) {return {"tokens": [], "error": error}}
            tokens.push(token)
            break
          case "<":
            token = this.make_lesser_than()
            tokens.push(token)
            break
          case ">":
            token = this.make_greater_than()
            tokens.push(token)
            break
          default:
            const pos_start = this.pos.copy()
            const char = this.current_char
            this.advance.call(this)
            error = new IllegalCharError(pos_start, this.pos, `'${char}'`)
            return {"tokens": [], "error": error}
        }
      }
    }
    return {"tokens": tokens, "error": null}
  }

  make_number() {
    let token = null
    let num_str = ""
    let dot_count = 0
    const pos_start = this.pos.copy()
    while (this.current_char !== undefined && `${DIGITS}.`.includes(this.current_char)) {
      if (this.current_char === ".") {
        dot_count += 1
        if (dot_count > 1) {
          break
        }
      }
      num_str += this.current_char
      this.advance.call(this)
    }
    if (dot_count === 0) {
      token = new Token(TT_INT, parseInt(num_str, 10), pos_start, this.pos)
      return token
    }
    token = new Token(TT_FLOAT, parseFloat(num_str), pos_start, this.pos)
    return token
  }

  make_identifier() {
    let id_string = ""
    const pos_start = this.pos.copy()
    while (this.current_char !== null && `${LETTERS_DIGITS}_`.includes(this.current_char)) {
      id_string += this.current_char
      this.advance.call(this)
    }
    const token_type = KEYWORDS.includes(id_string) ? TT_KEYWORD : TT_IDENTIFIER
    if (id_string === "eof") {token_type = TT_EOF}
    const token = new Token(token_type, id_string, pos_start, this.pos)
    return token
  }

  make_not_equals() {
    const pos_start = this.pos.copy()
    this.advance.call(this)
    if (this.current_char === "=") {
      this.advance.call(this)
      const token = new Token(TT_NE, null, pos_start, this.pos)
      return {"token": token, "error": null}
    }
    this.advance.call(this)
    const error = new ExpectedCharacterError(pos_start, this.pos, "Expected '=' (after '!')")
    return {"token": null, "error": error}
  }

  make_equals() {
    const pos_start = this.pos.copy()
    let token_type = TT_EQ
    this.advance.call(this)
    if (this.current_char === "=") {
      this.advance.call(this)
      token_type = TT_EE
    }
    this.advance.call(this)
    const token = new Token(token_type, null, pos_start, this.pos)
    return token
  }

  make_lesser_than() {
    const pos_start = this.pos.copy()
    let token_type = TT_LT
    this.advance.call(this)
    if (this.current_char === "=") {
      this.advance.call(this)
      token_type = TT_LTE
    }
    this.advance.call(this)
    const token = new Token(token_type, null, pos_start, this.pos)
    return token
  }

  make_greater_than() {
    const pos_start = this.pos.copy()
    let token_type = TT_GT
    this.advance.call(this)
    if (this.current_char === "=") {
      this.advance.call(this)
      token_type = TT_GTE
    }
    const token = new Token(token_type, null, pos_start, this.pos)
    return token
  }
}

// Token
class Token {
  constructor(type, value=null, pos_start=null, pos_end=null) {
    this.type = type
    this.value = value
    if (this.value !== null) {this.representation = `${this.type}:${this.value}`} else {this.representation = this.type}
    if (pos_start !== null) {
      this.pos_start = pos_start.copy()
      this.pos_end = pos_start.copy()
      this.pos_end.advance()
    }
    if (pos_end !== null) {
      this.pos_end = pos_end
    }
  }

  matches(type, value) {
    return this.type === type && this.value === value
  }
}

// Position
class Position {
  constructor(index, line, col, fn, ftxt) {
    this.index = index
    this.line = line
    this.col = col
    this.fn = fn
    this.ftxt = ftxt
  }

  advance(current_char=null) {
    this.index += 1
    this.col += 1
    if (current_char === "\n") {
      this.line += 1
      this.col = 0
    }
    return this
  }

  copy() {
    const position = new Position(this.index, this.line, this.col, this.fn, this.ftxt)
    return position
  }
}

// Nodes
class NumberNode {
  constructor(token) {
    this.token = token
    this.pos_start = this.token.pos_start
    this.pos_end = this.token.pos_end
    this.representation = `${this.token.representation}`
  }
}

class UnaryOperationNode {
  constructor(operator_token, node) {
    this.operator_token = operator_token
    this.node = node
    this.pos_start = operator_token.pos_start
    this.pos_end = node.pos_end
    this.representation = `(${this.operator_token.representation}, ${node.representation})`
  }
}

class BinaryOperationNode {
  constructor(left_node, operator_token, right_node) {
    this.left_node = left_node
    this.operator_token = operator_token
    this.right_node = right_node
    this.pos_start = this.left_node.pos_start
    this.pos_end = this.right_node.pos_end
    this.representation = `(${left_node.representation}, ${operator_token.representation}, ${right_node.representation})`
  }
}

class VariableAssignmentNode {
  constructor(var_name_token, value_node) {
    this.var_name_token = var_name_token
    this.value_node = value_node
    this.pos_start = this.var_name_token.pos_start
    this.pos_end = this.value_node.pos_end
  }
}

class VariableAccessNode {
  constructor(var_name_token) {
    this.var_name_token = var_name_token
    this.pos_start = this.var_name_token.pos_start
    this.pos_end = this.var_name_token.pos_end
  }
}

// Parser
class Parser {
  constructor(tokens) {
    this.tokens = tokens
    this.token_index = -1
    this.advance.call(this)
  }

  advance() {
    this.token_index += 1
    if (this.token_index < this.tokens.length) {
      this.current_token = this.tokens[this.token_index]
    }
    return this.current_token
  }

  parse() {
    const res = this.expression.call(this)
    if (res.error !== null && this.current_token.type !== TT_EOF) {
      const error = new InvalidSyntaxError(this.current_token.pos_start, this.current_token.pos_end, "Expected '+', '-', '*', '/' or identifier")
      return res.failure(error)
    }
    return res
  }

  atom() {
    const res = new ParseResult()
    const token = this.current_token
    if ([TT_INT, TT_FLOAT].includes(token.type)) {
      const node = new NumberNode(token)
      res.register_advancement()
      this.advance.call(this)
      return res.success(node)
    } else if (token.type === TT_IDENTIFIER) {
      res.register_advancement()
      this.advance.call(this)
      const node = new VariableAccessNode(token)
      return res.success(node)
    } else if (token.type === TT_LPAREN) {
      res.register_advancement()
      this.advance.call(this)
      const expression = res.register(this.expression())
      if (res.error !== null) {return res}
      if (this.current_token.type === TT_RPAREN) {
        res.register_advancement()
        this.advance.call(this)
        return res.success(expression)
      } else {
        const error = new InvalidSyntaxError(this.current_token.pos_start, this.current_token.pos_end, "Expected ')'")
        return res.failure(error)
      }
    }
    const error = new InvalidSyntaxError(token.pos_start, token.pos_end, "Expected int, float, identifier, '+', '-' or '('")
    return res.failure(error)
  }

  power() {
    return this.binary_operation.call(this, this.atom, [TT_POW], this.factor)
  }

  factor() {
    const res = new ParseResult()
    const token = this.current_token
    if ([TT_PLUS, TT_MINUS].includes(token.type)) {
      res.register_advancement()
      this.advance.call(this)
      const factor = res.register(this.factor.call(this))
      if (res.error === null) {
        const unary = new UnaryOperationNode(token, factor)
        return res.success(unary)
      } else {return res}
    }
    return this.power()
  }

  term() {
    return this.binary_operation.call(this, this.factor, [TT_MUL, TT_DIV])
  }

  expression() {
    const res = new ParseResult()
    if (this.current_token.matches(TT_KEYWORD, "var")) {
      res.register_advancement()
      this.advance.call(this)
      if (this.current_token.type !== TT_IDENTIFIER) {
        const error = new InvalidSyntaxError(this.current_token.pos_start, this.current_token.pos_end, "Expected identifier")
        return res.failure(error)
      }
      const var_name = this.current_token
      res.register_advancement()
      this.advance.call(this)
      if (this.current_token.type !== TT_EQ) {
        const error = new InvalidSyntaxError(this.current_token.pos_start, this.current_token.pos_end, "Expected '='")
        return res.failure(error)
      }
      res.register_advancement()
      this.advance.call(this)
      const expression_ = res.register(this.expression.call(this))
      if (res.error !== null) {return res}
      const node = new VariableAssignmentNode(var_name, expression_)
      return res.success(node)
    }
    const node = res.register(this.binary_operation.call(this, this.comparison_expression, [[TT_KEYWORD, "and"], [TT_KEYWORD, "or"]]))
    if (res.error !== null) {
      const error = new InvalidSyntaxError(this.current_token.pos_start, this.current_token.pos_end, "Expected '+', '-', '*', '/', identifier or 'var'")
      res.failure(error)
    }
    return res.success(node)
  }

  comparison_expression() {
    const res = new ParseResult()
    let node = null
    if (this.current_token.matches(TT_KEYWORD, "not")) {
      const operator_token = this.current_token
      res.register_advancement()
      this.advance()
      node = res.register(this.comparison_expression.call(this))
      if (res.error !== null) {return res}
      const unary = new UnaryOperationNode(operator_token, node)
      return res.success(unary)
    }
    node = res.register(this.binary_operation.call(this, this.arithmetic_expression, [TT_EE, TT_NE, TT_GT, TT_LT, TT_GTE, TT_LTE]))
    if (res.error !== null) {
      const error = new InvalidSyntaxError(this.current_token.pos_start, this.current_token.pos_end, "Expected int, float, identifier, '+', '-', '(' or 'not'")
      return res.failure(error)
    }
    return res.success(node)
  }

  arithmetic_expression() {
    return this.binary_operation.call(this, this.term, [TT_PLUS, TT_MINUS])
  }

  binary_operation(func_a, operations, func_b=null) {
    if (func_b === null) {
      func_b = func_a
    }
    const res = new ParseResult()
    let left = res.register(func_a.call(this))
    if (res.error !== null) {return res}
    while (operations.includes(this.current_token.type) || operations.includes([this.current_token.type, this.current_token.value])) {
      const operator_token = this.current_token
      res.register_advancement()
      this.advance.call(this)
      const right = res.register(func_b.call(this))
      if (res.error !== null) {return res}
      left = new BinaryOperationNode(left, operator_token, right)
    }
    return res.success(left)
  }
}

// Parse Result
class ParseResult {
  constructor() {
    this.error = null
    this.node = null
    this.advance_count = 0
  }

  register_advancement() {
    this.advance_count++
  }

  register(res) {
    this.advance_count += res.advance_count
    if (res.error !== null) {this.error = res.error}
    return res.node
  }

  success(node) {
    this.node = node
    return this
  }

  failure(error) {
    if (this.error === null || this.advance_count === 0) {this.error = error}
    return this
  }
}

// Runtime result
class RunTimeResult {
  constructor() {
    this.value = null
    this.error = null
  }

  register(res) {
    if (res.error) {this.error = res.error}
    return res.value
  }

  success(value) {
    this.value = value
    return this
  }

  failure(error) {
    this.error = error
    return this
  }
}

// Values
class Number {
  constructor(value) {
    this.value = value
    this.representation = `${this.value}`
    this.set_position.call(this)
    this.set_context.call(this)
  }

  set_position(pos_start=null, pos_end=null) {
    this.pos_start = pos_start
    this.pos_end = pos_end
    return this
  }

  set_context(context=null) {
    this.context = context
    return this
  }

  copy() {
    const copy = new Number(this.value)
    copy.set_position(this.pos_start, this.pos_end)
    copy.set_context(this.context)
    return copy
  }

  add(other) {
    if (other instanceof Number) {
      let return_result = {"result": null, "error": null}
      const number = new Number(this.value + other.value).set_context(this.context)
      return_result.result = number
      return return_result
    }
  }

  subtract(other) {
    if (other instanceof Number) {
      let return_result = {"result": null, "error": null}
      const number = new Number(this.value - other.value).set_context(this.context)
      return_result.result = number
      return return_result
    }
  }

  multiply(other) {
    if (other instanceof Number) {
      let return_result = {"result": null, "error": null}
      const number = new Number(this.value * other.value).set_context(this.context)
      return_result.result = number
      return return_result
    }
  }

  divide(other) {
    if (other instanceof Number) {
      let return_result = {"result": null, "error": null}
      if (other.value === 0) {
        const runtime_error = new RunTimeError(other.pos_start, other.pos_end, "Division by zero", this.context)
        return_result.error = runtime_error
        return return_result
      }
      const number = new Number(this.value / other.value).set_context(this.context)
      return_result.result = number
      return return_result
    }
  }

  power(other) {
    if (other instanceof Number) {
      let return_result = {"result": null, "error": null}
      const number = new Number(this.value ** other.value).set_context(this.context)
      return_result.result = number
      return return_result
    }
  }

  equal(other) {
    if (other instanceof Number) {
      let return_result = {"result": null, "error": null}
      const number = new Number(parseInt(((this.value === other.value) + 0).toString(), 10)).set_context(this.context)
      return_result.result = number
      return return_result
    }
  }

  not_equal(other) {
    if (other instanceof Number) {
      let return_result = {"result": null, "error": null}
      const number = new Number(parseInt(((this.value !== other.value) + 0).toString(), 10)).set_context(this.context)
      return_result.result = number
      return return_result
    }
  }

  greater_than(other) {
    if (other instanceof Number) {
      let return_result = {"result": null, "error": null}
      const number = new Number(parseInt(((this.value > other.value) + 0).toString(), 10)).set_context(this.context)
      return_result.result = number
      return return_result
    }
  }

  lesser_than(other) {
    if (other instanceof Number) {
      let return_result = {"result": null, "error": null}
      const number = new Number(parseInt(((this.value < other.value) + 0).toString(), 10)).set_context(this.context)
      return_result.result = number
      return return_result
    }
  }
  
  greater_than_or_equal(other) {
    if (other instanceof Number) {
      let return_result = {"result": null, "error": null}
      const number = new Number(parseInt(((this.value >= other.value) + 0).toString(), 10)).set_context(this.context)
      return_result.result = number
      return return_result
    }
  }

  lesser_than_or_equal(other) {
    if (other instanceof Number) {
      let return_result = {"result": null, "error": null}
      const number = new Number(parseInt(((this.value <= other.value) + 0).toString(), 10)).set_context(this.context)
      return_result.result = number
      return return_result
    }
  }

  and(other) {
    if (other instanceof Number) {
      let return_result = {"result": null, "error": null}
      const number = new Number(parseInt(((this.value && other.value) + 0).toString(), 10)).set_context(this.context)
      return_result.result = number
      return return_result
    }
  }

  or(other) {
    if (other instanceof Number) {
      let return_result = {"result": null, "error": null}
      const number = new Number(parseInt(((this.value || other.value) + 0).toString(), 10)).set_context(this.context)
      return_result.result = number
      return return_result
    }
  }
}

// Context
class Context {
  constructor(display_name, parent=null, parent_entry_position=null) {
    this.display_name = display_name
    this.parent = parent
    this.parent_entry_position = parent_entry_position
    this.symbol_table = null
  }
}

// Symbol Table
class SymbolTable {
  constructor() {
    this.symbols = {}
    this.parent = null
  }

  get_(name) {
    let value = this.symbols[name]
    if (value === undefined && this.parent !== null) {
      return this.parent.get_(name)
    }
    return value
  }

  set_(name, value) {
    this.symbols[name] = value
  }

  remove(name) {
    this.symbols[name] = undefined
  }
}

// Interpreter
class Interpreter {
  visit(node, context) {
    const method_name = `visit_${node.constructor.name}`
    const method = this[method_name] || this.no_visit_method
    return method.call(this, node, context)
  }

  no_visit_method(node, context) {
    throw new Error(`No visit_${node.constructor.name} method defined`)
  }

  visit_NumberNode(node, context) {
    const number = new Number(node.token.value)
    const runtime_result = new RunTimeResult()
    return runtime_result.success(number.set_context(context).set_position(node.pos_start, node.pos_end))
  }

  visit_BinaryOperationNode(node, context) {
    const res = new RunTimeResult()
    const left = res.register(this.visit.call(this, node.left_node, context))
    if (res.error) {return res}
    const right = res.register(this.visit.call(this, node.right_node, context))
    if (res.error) {return res}
    let result = null
    let error = null
    let overall = null
    switch (node.operator_token.type) {
      case TT_PLUS:
        overall = left.add(right)
        result = overall.result
        error = overall.error
        break
      case TT_MINUS:
        overall = left.subtract(right)
        result = overall.result
        error = overall.error
        break
      case TT_MUL:
        overall = left.multiply(right)
        result = overall.result
        error = overall.error
        break
      case TT_DIV:
        overall = left.divide(right)
        result = overall.result
        error = overall.error
        break
      case TT_POW:
        overall = left.power(right)
        result = overall.result
        error = overall.error
        break
      case TT_EE:
        overall = left.equal(right)
        result = overall.result
        error = overall.error
        break
      case TT_NE:
        overall = left.not_equal(right)
        result = overall.result
        error = overall.error
        break
      case TT_GT:
        overall = left.greater_than(right)
        result = overall.result
        error = overall.error
        break
      case TT_LT:
        overall = left.lesser_than(right)
        result = overall.result
        error = overall.error
        break
      case TT_GTE:
        overall = left.greater_than_or_equal(right)
        result = overall.result
        error = overall.error
        break
      case TT_LTE:
        overall = left.lesser_than_or_equal(right)
        result = overall.result
        error = overall.error
        break
      case TT_KEYWORD:
        switch (node.operator_token.value) {
          case "and":
            overall = left.and(right)
            result = overall.result
            error = overall.error
            break
          case "or":
            overall = left.or(right)
            result = overall.result
            error = overall.error
            break
        }
        break
    }
    if (error !== null) {
      return res.failure(error)
    } else {
      return res.success(result.set_position(node.pos_start, node.pos_end))
    }
  }

  visit_UnaryOperationNode(node, context) {
    const res = new RunTimeResult()
    let number = res.register(this.visit.call(this, node.node, context))
    let error = null
    if (res.error !== null) {return res}
    if (node.operator_token.type === TT_MINUS) {
      const mul = new Number(-1)
      const overall = number.multiply(mul)
      number = overall.result
      error = overall.error
    } else if (node.operator_token.matches(TT_KEYWORD, "not")) {
      number = new Number(parseInt((!!number.value + 0).toString(), 10))
      const one = new Number(1)
      const overall = one.subtract(number)
      number = overall.result
      error = overall.error
    }
    if (error !== null) {return res.failure(error)}
    return res.success(number.set_position(node.pos_start, node.pos_end))
  }

  visit_VariableAssignmentNode(node, context) {
    const res = new RunTimeResult()
    const var_name = node.var_name_token.value
    const value = res.register(this.visit.call(this, node.value_node, context))
    if (res.error !== null) {return res}
    context.symbol_table.set_(var_name, value)
    return res.success(value)
  }

  visit_VariableAccessNode(node, context) {
    const res = new RunTimeResult()
    const var_name = node.var_name_token.value
    let value = context.symbol_table.get_(var_name)
    if (value === undefined) {
      const error = new RunTimeError(node.pos_start, node.pos_end, `'${var_name}' is not defined.`, context)
      return res.failure(error)
    }
    value = value.copy().set_position(node.pos_start, node.pos_end)
    return res.success(value)
  }

  copy() {
    const copy = new Number(this.value)
    copy.set_position(this.pos_start, this.pos_end)
    copy.set_context(this.context)
    return copy
  }
}

const global_symbol_table = new SymbolTable()
const zero = new Number(0)
const one = new Number(1)
const negative_one = new Number(-1)
global_symbol_table.set_("null", zero)
global_symbol_table.set_("negator", negative_one)
global_symbol_table.set_("true", one)
global_symbol_table.set_("false", zero)

function run(fn, text) {
  // Return statement form
  let return_statement = {"result": null, "error": null}

  // Generate tokens
  const lexer = new Lexer(fn, text)
  const overall = lexer.make_tokens()
  const tokens = overall.tokens
  const error = overall.error
  if (error !== null) {
    return_statement.error = error
    return return_statement
  }

  // Generate Abstract Syntax Tree
  const parser = new Parser(tokens)
  const abstract_syntax_tree = parser.parse()
  if (abstract_syntax_tree.error !== null) {
    return_statement.error = abstract_syntax_tree.error
    return return_statement
  }

  // Run program
  const interpreter = new Interpreter()
  const context = new Context("<program>")
  context.symbol_table = global_symbol_table
  const result = interpreter.visit(abstract_syntax_tree.node, context)
  return_statement.result = result.value
  return_statement.error = result.error
  return return_statement
}

function actually_run() {
  const overall = run("<stdin>", sheet.getRange("A1").getValue().toString())
  const result = overall.result
  const error = overall.error
  if (error === null) {Logger.log(result.representation)} else {Logger.log(error.as_string)}
}
