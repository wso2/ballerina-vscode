// This is an auto-generated file. Do not edit.
// Run 'BALLERINA_HOME="your/ballerina/home" npm run gen-models' to generate.
import * as Ballerina from "./syntax-tree-interfaces";

export class STKindChecker {
    public static isActionStatement(node: Ballerina.STNode): node is Ballerina.ActionStatement {
        return node.kind === "ActionStatement";
    }

    public static isAnnotAccess(node: Ballerina.STNode): node is Ballerina.AnnotAccess {
        return node.kind === "AnnotAccess";
    }

    public static isAnnotChainingToken(node: Ballerina.STNode): node is Ballerina.AnnotChainingToken {
        return node.kind === "AnnotChainingToken";
    }

    public static isAnnotation(node: Ballerina.STNode): node is Ballerina.Annotation {
        return node.kind === "Annotation";
    }

    public static isAnnotationAttachPoint(node: Ballerina.STNode): node is Ballerina.AnnotationAttachPoint {
        return node.kind === "AnnotationAttachPoint";
    }

    public static isAnnotationDeclaration(node: Ballerina.STNode): node is Ballerina.AnnotationDeclaration {
        return node.kind === "AnnotationDeclaration";
    }

    public static isAnnotationDocReferenceToken(node: Ballerina.STNode): node is Ballerina.AnnotationDocReferenceToken {
        return node.kind === "AnnotationDocReferenceToken";
    }

    public static isAnnotationKeyword(node: Ballerina.STNode): node is Ballerina.AnnotationKeyword {
        return node.kind === "AnnotationKeyword";
    }

    public static isAnyKeyword(node: Ballerina.STNode): node is Ballerina.AnyKeyword {
        return node.kind === "AnyKeyword";
    }

    public static isAnyTypeDesc(node: Ballerina.STNode): node is Ballerina.AnyTypeDesc {
        return node.kind === "AnyTypeDesc";
    }

    public static isAnydataKeyword(node: Ballerina.STNode): node is Ballerina.AnydataKeyword {
        return node.kind === "AnydataKeyword";
    }

    public static isAnydataTypeDesc(node: Ballerina.STNode): node is Ballerina.AnydataTypeDesc {
        return node.kind === "AnydataTypeDesc";
    }

    public static isArrayDimension(node: Ballerina.STNode): node is Ballerina.ArrayDimension {
        return node.kind === "ArrayDimension";
    }

    public static isArrayTypeDesc(node: Ballerina.STNode): node is Ballerina.ArrayTypeDesc {
        return node.kind === "ArrayTypeDesc";
    }

    public static isAsKeyword(node: Ballerina.STNode): node is Ballerina.AsKeyword {
        return node.kind === "AsKeyword";
    }

    public static isAscendingKeyword(node: Ballerina.STNode): node is Ballerina.AscendingKeyword {
        return node.kind === "AscendingKeyword";
    }

    public static isAssignmentStatement(node: Ballerina.STNode): node is Ballerina.AssignmentStatement {
        return node.kind === "AssignmentStatement";
    }

    public static isAsteriskLiteral(node: Ballerina.STNode): node is Ballerina.AsteriskLiteral {
        return node.kind === "AsteriskLiteral";
    }

    public static isAsteriskToken(node: Ballerina.STNode): node is Ballerina.AsteriskToken {
        return node.kind === "AsteriskToken";
    }

    public static isAsyncSendAction(node: Ballerina.STNode): node is Ballerina.AsyncSendAction {
        return node.kind === "AsyncSendAction";
    }

    public static isAtToken(node: Ballerina.STNode): node is Ballerina.AtToken {
        return node.kind === "AtToken";
    }

    public static isBackSlashToken(node: Ballerina.STNode): node is Ballerina.BackSlashToken {
        return node.kind === "BackSlashToken";
    }

    public static isBacktickToken(node: Ballerina.STNode): node is Ballerina.BacktickToken {
        return node.kind === "BacktickToken";
    }

    public static isBallerinaNameReference(node: Ballerina.STNode): node is Ballerina.BallerinaNameReference {
        return node.kind === "BallerinaNameReference";
    }

    public static isBase16Keyword(node: Ballerina.STNode): node is Ballerina.Base16Keyword {
        return node.kind === "Base16Keyword";
    }

    public static isBase64Keyword(node: Ballerina.STNode): node is Ballerina.Base64Keyword {
        return node.kind === "Base64Keyword";
    }

    public static isBinaryExpression(node: Ballerina.STNode): node is Ballerina.BinaryExpression {
        return node.kind === "BinaryExpression";
    }

    public static isBitwiseAndToken(node: Ballerina.STNode): node is Ballerina.BitwiseAndToken {
        return node.kind === "BitwiseAndToken";
    }

    public static isBitwiseXorToken(node: Ballerina.STNode): node is Ballerina.BitwiseXorToken {
        return node.kind === "BitwiseXorToken";
    }

    public static isBlockStatement(node: Ballerina.STNode): node is Ballerina.BlockStatement {
        return node.kind === "BlockStatement";
    }

    public static isBooleanKeyword(node: Ballerina.STNode): node is Ballerina.BooleanKeyword {
        return node.kind === "BooleanKeyword";
    }

    public static isBooleanLiteral(node: Ballerina.STNode): node is Ballerina.BooleanLiteral {
        return node.kind === "BooleanLiteral";
    }

    public static isBooleanTypeDesc(node: Ballerina.STNode): node is Ballerina.BooleanTypeDesc {
        return node.kind === "BooleanTypeDesc";
    }

    public static isBracedAction(node: Ballerina.STNode): node is Ballerina.BracedAction {
        return node.kind === "BracedAction";
    }

    public static isBracedExpression(node: Ballerina.STNode): node is Ballerina.BracedExpression {
        return node.kind === "BracedExpression";
    }

    public static isBreakKeyword(node: Ballerina.STNode): node is Ballerina.BreakKeyword {
        return node.kind === "BreakKeyword";
    }

    public static isBreakStatement(node: Ballerina.STNode): node is Ballerina.BreakStatement {
        return node.kind === "BreakStatement";
    }

    public static isByKeyword(node: Ballerina.STNode): node is Ballerina.ByKeyword {
        return node.kind === "ByKeyword";
    }

    public static isByteArrayLiteral(node: Ballerina.STNode): node is Ballerina.ByteArrayLiteral {
        return node.kind === "ByteArrayLiteral";
    }

    public static isByteKeyword(node: Ballerina.STNode): node is Ballerina.ByteKeyword {
        return node.kind === "ByteKeyword";
    }

    public static isByteTypeDesc(node: Ballerina.STNode): node is Ballerina.ByteTypeDesc {
        return node.kind === "ByteTypeDesc";
    }

    public static isCallStatement(node: Ballerina.STNode): node is Ballerina.CallStatement {
        return node.kind === "CallStatement";
    }

    public static isCaptureBindingPattern(node: Ballerina.STNode): node is Ballerina.CaptureBindingPattern {
        return node.kind === "CaptureBindingPattern";
    }

    public static isCheckAction(node: Ballerina.STNode): node is Ballerina.CheckAction {
        return node.kind === "CheckAction";
    }

    public static isCheckExpression(node: Ballerina.STNode): node is Ballerina.CheckExpression {
        return node.kind === "CheckExpression";
    }

    public static isCheckKeyword(node: Ballerina.STNode): node is Ballerina.CheckKeyword {
        return node.kind === "CheckKeyword";
    }

    public static isCheckpanicKeyword(node: Ballerina.STNode): node is Ballerina.CheckpanicKeyword {
        return node.kind === "CheckpanicKeyword";
    }

    public static isClassDefinition(node: Ballerina.STNode): node is Ballerina.ClassDefinition {
        return node.kind === "ClassDefinition";
    }

    public static isClassKeyword(node: Ballerina.STNode): node is Ballerina.ClassKeyword {
        return node.kind === "ClassKeyword";
    }

    public static isClientKeyword(node: Ballerina.STNode): node is Ballerina.ClientKeyword {
        return node.kind === "ClientKeyword";
    }

    public static isClientResourceAccessAction(node: Ballerina.STNode): node is Ballerina.ClientResourceAccessAction {
        return node.kind === "ClientResourceAccessAction";
    }

    public static isCloseBracePipeToken(node: Ballerina.STNode): node is Ballerina.CloseBracePipeToken {
        return node.kind === "CloseBracePipeToken";
    }

    public static isCloseBraceToken(node: Ballerina.STNode): node is Ballerina.CloseBraceToken {
        return node.kind === "CloseBraceToken";
    }

    public static isCloseBracketToken(node: Ballerina.STNode): node is Ballerina.CloseBracketToken {
        return node.kind === "CloseBracketToken";
    }

    public static isCloseParenToken(node: Ballerina.STNode): node is Ballerina.CloseParenToken {
        return node.kind === "CloseParenToken";
    }

    public static isCodeContent(node: Ballerina.STNode): node is Ballerina.CodeContent {
        return node.kind === "CodeContent";
    }

    public static isColonToken(node: Ballerina.STNode): node is Ballerina.ColonToken {
        return node.kind === "ColonToken";
    }

    public static isCommaToken(node: Ballerina.STNode): node is Ballerina.CommaToken {
        return node.kind === "CommaToken";
    }

    public static isCommitAction(node: Ballerina.STNode): node is Ballerina.CommitAction {
        return node.kind === "CommitAction";
    }

    public static isCommitKeyword(node: Ballerina.STNode): node is Ballerina.CommitKeyword {
        return node.kind === "CommitKeyword";
    }

    public static isCompoundAssignmentStatement(node: Ballerina.STNode): node is Ballerina.CompoundAssignmentStatement {
        return node.kind === "CompoundAssignmentStatement";
    }

    public static isComputedNameField(node: Ballerina.STNode): node is Ballerina.ComputedNameField {
        return node.kind === "ComputedNameField";
    }

    public static isComputedResourceAccessSegment(node: Ballerina.STNode): node is Ballerina.ComputedResourceAccessSegment {
        return node.kind === "ComputedResourceAccessSegment";
    }

    public static isConditionalExpression(node: Ballerina.STNode): node is Ballerina.ConditionalExpression {
        return node.kind === "ConditionalExpression";
    }

    public static isConfigurableKeyword(node: Ballerina.STNode): node is Ballerina.ConfigurableKeyword {
        return node.kind === "ConfigurableKeyword";
    }

    public static isConflictKeyword(node: Ballerina.STNode): node is Ballerina.ConflictKeyword {
        return node.kind === "ConflictKeyword";
    }

    public static isConstDeclaration(node: Ballerina.STNode): node is Ballerina.ConstDeclaration {
        return node.kind === "ConstDeclaration";
    }

    public static isConstDocReferenceToken(node: Ballerina.STNode): node is Ballerina.ConstDocReferenceToken {
        return node.kind === "ConstDocReferenceToken";
    }

    public static isConstKeyword(node: Ballerina.STNode): node is Ballerina.ConstKeyword {
        return node.kind === "ConstKeyword";
    }

    public static isContinueKeyword(node: Ballerina.STNode): node is Ballerina.ContinueKeyword {
        return node.kind === "ContinueKeyword";
    }

    public static isContinueStatement(node: Ballerina.STNode): node is Ballerina.ContinueStatement {
        return node.kind === "ContinueStatement";
    }

    public static isDecimalFloatingPointLiteralToken(node: Ballerina.STNode): node is Ballerina.DecimalFloatingPointLiteralToken {
        return node.kind === "DecimalFloatingPointLiteralToken";
    }

    public static isDecimalIntegerLiteralToken(node: Ballerina.STNode): node is Ballerina.DecimalIntegerLiteralToken {
        return node.kind === "DecimalIntegerLiteralToken";
    }

    public static isDecimalKeyword(node: Ballerina.STNode): node is Ballerina.DecimalKeyword {
        return node.kind === "DecimalKeyword";
    }

    public static isDecimalTypeDesc(node: Ballerina.STNode): node is Ballerina.DecimalTypeDesc {
        return node.kind === "DecimalTypeDesc";
    }

    public static isDefaultableParam(node: Ballerina.STNode): node is Ballerina.DefaultableParam {
        return node.kind === "DefaultableParam";
    }

    public static isDeprecationLiteral(node: Ballerina.STNode): node is Ballerina.DeprecationLiteral {
        return node.kind === "DeprecationLiteral";
    }

    public static isDescendingKeyword(node: Ballerina.STNode): node is Ballerina.DescendingKeyword {
        return node.kind === "DescendingKeyword";
    }

    public static isDistinctKeyword(node: Ballerina.STNode): node is Ballerina.DistinctKeyword {
        return node.kind === "DistinctKeyword";
    }

    public static isDistinctTypeDesc(node: Ballerina.STNode): node is Ballerina.DistinctTypeDesc {
        return node.kind === "DistinctTypeDesc";
    }

    public static isDoKeyword(node: Ballerina.STNode): node is Ballerina.DoKeyword {
        return node.kind === "DoKeyword";
    }

    public static isDoStatement(node: Ballerina.STNode): node is Ballerina.DoStatement {
        return node.kind === "DoStatement";
    }

    public static isDocumentationDescription(node: Ballerina.STNode): node is Ballerina.DocumentationDescription {
        return node.kind === "DocumentationDescription";
    }

    public static isDotLtToken(node: Ballerina.STNode): node is Ballerina.DotLtToken {
        return node.kind === "DotLtToken";
    }

    public static isDotToken(node: Ballerina.STNode): node is Ballerina.DotToken {
        return node.kind === "DotToken";
    }

    public static isDoubleBacktickToken(node: Ballerina.STNode): node is Ballerina.DoubleBacktickToken {
        return node.kind === "DoubleBacktickToken";
    }

    public static isDoubleDotLtToken(node: Ballerina.STNode): node is Ballerina.DoubleDotLtToken {
        return node.kind === "DoubleDotLtToken";
    }

    public static isDoubleEqualToken(node: Ballerina.STNode): node is Ballerina.DoubleEqualToken {
        return node.kind === "DoubleEqualToken";
    }

    public static isDoubleGtToken(node: Ballerina.STNode): node is Ballerina.DoubleGtToken {
        return node.kind === "DoubleGtToken";
    }

    public static isDoubleLtToken(node: Ballerina.STNode): node is Ballerina.DoubleLtToken {
        return node.kind === "DoubleLtToken";
    }

    public static isDoubleQuoteToken(node: Ballerina.STNode): node is Ballerina.DoubleQuoteToken {
        return node.kind === "DoubleQuoteToken";
    }

    public static isDoubleSlashDoubleAsteriskLtToken(node: Ballerina.STNode): node is Ballerina.DoubleSlashDoubleAsteriskLtToken {
        return node.kind === "DoubleSlashDoubleAsteriskLtToken";
    }

    public static isEllipsisToken(node: Ballerina.STNode): node is Ballerina.EllipsisToken {
        return node.kind === "EllipsisToken";
    }

    public static isElseBlock(node: Ballerina.STNode): node is Ballerina.ElseBlock {
        return node.kind === "ElseBlock";
    }

    public static isElseKeyword(node: Ballerina.STNode): node is Ballerina.ElseKeyword {
        return node.kind === "ElseKeyword";
    }

    public static isElvisToken(node: Ballerina.STNode): node is Ballerina.ElvisToken {
        return node.kind === "ElvisToken";
    }

    public static isEnumDeclaration(node: Ballerina.STNode): node is Ballerina.EnumDeclaration {
        return node.kind === "EnumDeclaration";
    }

    public static isEnumKeyword(node: Ballerina.STNode): node is Ballerina.EnumKeyword {
        return node.kind === "EnumKeyword";
    }

    public static isEnumMember(node: Ballerina.STNode): node is Ballerina.EnumMember {
        return node.kind === "EnumMember";
    }

    public static isEofToken(node: Ballerina.STNode): node is Ballerina.EofToken {
        return node.kind === "EofToken";
    }

    public static isEqualToken(node: Ballerina.STNode): node is Ballerina.EqualToken {
        return node.kind === "EqualToken";
    }

    public static isEqualsKeyword(node: Ballerina.STNode): node is Ballerina.EqualsKeyword {
        return node.kind === "EqualsKeyword";
    }

    public static isErrorBindingPattern(node: Ballerina.STNode): node is Ballerina.ErrorBindingPattern {
        return node.kind === "ErrorBindingPattern";
    }

    public static isErrorConstructor(node: Ballerina.STNode): node is Ballerina.ErrorConstructor {
        return node.kind === "ErrorConstructor";
    }

    public static isErrorKeyword(node: Ballerina.STNode): node is Ballerina.ErrorKeyword {
        return node.kind === "ErrorKeyword";
    }

    public static isErrorMatchPattern(node: Ballerina.STNode): node is Ballerina.ErrorMatchPattern {
        return node.kind === "ErrorMatchPattern";
    }

    public static isErrorTypeDesc(node: Ballerina.STNode): node is Ballerina.ErrorTypeDesc {
        return node.kind === "ErrorTypeDesc";
    }

    public static isExclamationMarkToken(node: Ballerina.STNode): node is Ballerina.ExclamationMarkToken {
        return node.kind === "ExclamationMarkToken";
    }

    public static isExplicitAnonymousFunctionExpression(node: Ballerina.STNode): node is Ballerina.ExplicitAnonymousFunctionExpression {
        return node.kind === "ExplicitAnonymousFunctionExpression";
    }

    public static isExplicitNewExpression(node: Ballerina.STNode): node is Ballerina.ExplicitNewExpression {
        return node.kind === "ExplicitNewExpression";
    }

    public static isExpressionFunctionBody(node: Ballerina.STNode): node is Ballerina.ExpressionFunctionBody {
        return node.kind === "ExpressionFunctionBody";
    }

    public static isExternalFunctionBody(node: Ballerina.STNode): node is Ballerina.ExternalFunctionBody {
        return node.kind === "ExternalFunctionBody";
    }

    public static isExternalKeyword(node: Ballerina.STNode): node is Ballerina.ExternalKeyword {
        return node.kind === "ExternalKeyword";
    }

    public static isFailKeyword(node: Ballerina.STNode): node is Ballerina.FailKeyword {
        return node.kind === "FailKeyword";
    }

    public static isFailStatement(node: Ballerina.STNode): node is Ballerina.FailStatement {
        return node.kind === "FailStatement";
    }

    public static isFalseKeyword(node: Ballerina.STNode): node is Ballerina.FalseKeyword {
        return node.kind === "FalseKeyword";
    }

    public static isFieldAccess(node: Ballerina.STNode): node is Ballerina.FieldAccess {
        return node.kind === "FieldAccess";
    }

    public static isFieldBindingPattern(node: Ballerina.STNode): node is Ballerina.FieldBindingPattern {
        return node.kind === "FieldBindingPattern";
    }

    public static isFieldKeyword(node: Ballerina.STNode): node is Ballerina.FieldKeyword {
        return node.kind === "FieldKeyword";
    }

    public static isFieldMatchPattern(node: Ballerina.STNode): node is Ballerina.FieldMatchPattern {
        return node.kind === "FieldMatchPattern";
    }

    public static isFinalKeyword(node: Ballerina.STNode): node is Ballerina.FinalKeyword {
        return node.kind === "FinalKeyword";
    }

    public static isFloatKeyword(node: Ballerina.STNode): node is Ballerina.FloatKeyword {
        return node.kind === "FloatKeyword";
    }

    public static isFloatTypeDesc(node: Ballerina.STNode): node is Ballerina.FloatTypeDesc {
        return node.kind === "FloatTypeDesc";
    }

    public static isFlushAction(node: Ballerina.STNode): node is Ballerina.FlushAction {
        return node.kind === "FlushAction";
    }

    public static isFlushKeyword(node: Ballerina.STNode): node is Ballerina.FlushKeyword {
        return node.kind === "FlushKeyword";
    }

    public static isForeachKeyword(node: Ballerina.STNode): node is Ballerina.ForeachKeyword {
        return node.kind === "ForeachKeyword";
    }

    public static isForeachStatement(node: Ballerina.STNode): node is Ballerina.ForeachStatement {
        return node.kind === "ForeachStatement";
    }

    public static isForkKeyword(node: Ballerina.STNode): node is Ballerina.ForkKeyword {
        return node.kind === "ForkKeyword";
    }

    public static isForkStatement(node: Ballerina.STNode): node is Ballerina.ForkStatement {
        return node.kind === "ForkStatement";
    }

    public static isFromClause(node: Ballerina.STNode): node is Ballerina.FromClause {
        return node.kind === "FromClause";
    }

    public static isFromKeyword(node: Ballerina.STNode): node is Ballerina.FromKeyword {
        return node.kind === "FromKeyword";
    }

    public static isFunctionBodyBlock(node: Ballerina.STNode): node is Ballerina.FunctionBodyBlock {
        return node.kind === "FunctionBodyBlock";
    }

    public static isFunctionCall(node: Ballerina.STNode): node is Ballerina.FunctionCall {
        return node.kind === "FunctionCall";
    }

    public static isFunctionDefinition(node: Ballerina.STNode): node is Ballerina.FunctionDefinition {
        return node.kind === "FunctionDefinition";
    }

    public static isFunctionDocReferenceToken(node: Ballerina.STNode): node is Ballerina.FunctionDocReferenceToken {
        return node.kind === "FunctionDocReferenceToken";
    }

    public static isFunctionKeyword(node: Ballerina.STNode): node is Ballerina.FunctionKeyword {
        return node.kind === "FunctionKeyword";
    }

    public static isFunctionSignature(node: Ballerina.STNode): node is Ballerina.FunctionSignature {
        return node.kind === "FunctionSignature";
    }

    public static isFunctionTypeDesc(node: Ballerina.STNode): node is Ballerina.FunctionTypeDesc {
        return node.kind === "FunctionTypeDesc";
    }

    public static isFutureKeyword(node: Ballerina.STNode): node is Ballerina.FutureKeyword {
        return node.kind === "FutureKeyword";
    }

    public static isFutureTypeDesc(node: Ballerina.STNode): node is Ballerina.FutureTypeDesc {
        return node.kind === "FutureTypeDesc";
    }

    public static isGtEqualToken(node: Ballerina.STNode): node is Ballerina.GtEqualToken {
        return node.kind === "GtEqualToken";
    }

    public static isGtToken(node: Ballerina.STNode): node is Ballerina.GtToken {
        return node.kind === "GtToken";
    }

    public static isHandleKeyword(node: Ballerina.STNode): node is Ballerina.HandleKeyword {
        return node.kind === "HandleKeyword";
    }

    public static isHandleTypeDesc(node: Ballerina.STNode): node is Ballerina.HandleTypeDesc {
        return node.kind === "HandleTypeDesc";
    }

    public static isHashToken(node: Ballerina.STNode): node is Ballerina.HashToken {
        return node.kind === "HashToken";
    }

    public static isHexFloatingPointLiteralToken(node: Ballerina.STNode): node is Ballerina.HexFloatingPointLiteralToken {
        return node.kind === "HexFloatingPointLiteralToken";
    }

    public static isHexIntegerLiteralToken(node: Ballerina.STNode): node is Ballerina.HexIntegerLiteralToken {
        return node.kind === "HexIntegerLiteralToken";
    }

    public static isIdentifierToken(node: Ballerina.STNode): node is Ballerina.IdentifierToken {
        return node.kind === "IdentifierToken";
    }

    public static isIfElseStatement(node: Ballerina.STNode): node is Ballerina.IfElseStatement {
        return node.kind === "IfElseStatement";
    }

    public static isIfKeyword(node: Ballerina.STNode): node is Ballerina.IfKeyword {
        return node.kind === "IfKeyword";
    }

    public static isImplicitAnonymousFunctionExpression(node: Ballerina.STNode): node is Ballerina.ImplicitAnonymousFunctionExpression {
        return node.kind === "ImplicitAnonymousFunctionExpression";
    }

    public static isImplicitNewExpression(node: Ballerina.STNode): node is Ballerina.ImplicitNewExpression {
        return node.kind === "ImplicitNewExpression";
    }

    public static isImportDeclaration(node: Ballerina.STNode): node is Ballerina.ImportDeclaration {
        return node.kind === "ImportDeclaration";
    }

    public static isImportKeyword(node: Ballerina.STNode): node is Ballerina.ImportKeyword {
        return node.kind === "ImportKeyword";
    }

    public static isImportOrgName(node: Ballerina.STNode): node is Ballerina.ImportOrgName {
        return node.kind === "ImportOrgName";
    }

    public static isImportPrefix(node: Ballerina.STNode): node is Ballerina.ImportPrefix {
        return node.kind === "ImportPrefix";
    }

    public static isInKeyword(node: Ballerina.STNode): node is Ballerina.InKeyword {
        return node.kind === "InKeyword";
    }

    public static isIncludedRecordParam(node: Ballerina.STNode): node is Ballerina.IncludedRecordParam {
        return node.kind === "IncludedRecordParam";
    }

    public static isIndexedExpression(node: Ballerina.STNode): node is Ballerina.IndexedExpression {
        return node.kind === "IndexedExpression";
    }

    public static isInferParamList(node: Ballerina.STNode): node is Ballerina.InferParamList {
        return node.kind === "InferParamList";
    }

    public static isInferredTypedescDefault(node: Ballerina.STNode): node is Ballerina.InferredTypedescDefault {
        return node.kind === "InferredTypedescDefault";
    }

    public static isInlineCodeReference(node: Ballerina.STNode): node is Ballerina.InlineCodeReference {
        return node.kind === "InlineCodeReference";
    }

    public static isIntKeyword(node: Ballerina.STNode): node is Ballerina.IntKeyword {
        return node.kind === "IntKeyword";
    }

    public static isIntTypeDesc(node: Ballerina.STNode): node is Ballerina.IntTypeDesc {
        return node.kind === "IntTypeDesc";
    }

    public static isInterpolation(node: Ballerina.STNode): node is Ballerina.Interpolation {
        return node.kind === "Interpolation";
    }

    public static isInterpolationStartToken(node: Ballerina.STNode): node is Ballerina.InterpolationStartToken {
        return node.kind === "InterpolationStartToken";
    }

    public static isIntersectionTypeDesc(node: Ballerina.STNode): node is Ballerina.IntersectionTypeDesc {
        return node.kind === "IntersectionTypeDesc";
    }

    public static isInvalidExpressionStatement(node: Ballerina.STNode): node is Ballerina.InvalidExpressionStatement {
        return node.kind === "InvalidExpressionStatement";
    }

    public static isIsKeyword(node: Ballerina.STNode): node is Ballerina.IsKeyword {
        return node.kind === "IsKeyword";
    }

    public static isIsolatedKeyword(node: Ballerina.STNode): node is Ballerina.IsolatedKeyword {
        return node.kind === "IsolatedKeyword";
    }

    public static isJoinClause(node: Ballerina.STNode): node is Ballerina.JoinClause {
        return node.kind === "JoinClause";
    }

    public static isJoinKeyword(node: Ballerina.STNode): node is Ballerina.JoinKeyword {
        return node.kind === "JoinKeyword";
    }

    public static isJsonKeyword(node: Ballerina.STNode): node is Ballerina.JsonKeyword {
        return node.kind === "JsonKeyword";
    }

    public static isJsonTypeDesc(node: Ballerina.STNode): node is Ballerina.JsonTypeDesc {
        return node.kind === "JsonTypeDesc";
    }

    public static isKeyKeyword(node: Ballerina.STNode): node is Ballerina.KeyKeyword {
        return node.kind === "KeyKeyword";
    }

    public static isKeySpecifier(node: Ballerina.STNode): node is Ballerina.KeySpecifier {
        return node.kind === "KeySpecifier";
    }

    public static isKeyTypeConstraint(node: Ballerina.STNode): node is Ballerina.KeyTypeConstraint {
        return node.kind === "KeyTypeConstraint";
    }

    public static isLeftArrowToken(node: Ballerina.STNode): node is Ballerina.LeftArrowToken {
        return node.kind === "LeftArrowToken";
    }

    public static isLetClause(node: Ballerina.STNode): node is Ballerina.LetClause {
        return node.kind === "LetClause";
    }

    public static isLetExpression(node: Ballerina.STNode): node is Ballerina.LetExpression {
        return node.kind === "LetExpression";
    }

    public static isLetKeyword(node: Ballerina.STNode): node is Ballerina.LetKeyword {
        return node.kind === "LetKeyword";
    }

    public static isLetVarDecl(node: Ballerina.STNode): node is Ballerina.LetVarDecl {
        return node.kind === "LetVarDecl";
    }

    public static isLimitClause(node: Ballerina.STNode): node is Ballerina.LimitClause {
        return node.kind === "LimitClause";
    }

    public static isLimitKeyword(node: Ballerina.STNode): node is Ballerina.LimitKeyword {
        return node.kind === "LimitKeyword";
    }

    public static isListBindingPattern(node: Ballerina.STNode): node is Ballerina.ListBindingPattern {
        return node.kind === "ListBindingPattern";
    }

    public static isListConstructor(node: Ballerina.STNode): node is Ballerina.ListConstructor {
        return node.kind === "ListConstructor";
    }

    public static isListMatchPattern(node: Ballerina.STNode): node is Ballerina.ListMatchPattern {
        return node.kind === "ListMatchPattern";
    }

    public static isListenerDeclaration(node: Ballerina.STNode): node is Ballerina.ListenerDeclaration {
        return node.kind === "ListenerDeclaration";
    }

    public static isListenerKeyword(node: Ballerina.STNode): node is Ballerina.ListenerKeyword {
        return node.kind === "ListenerKeyword";
    }

    public static isLocalVarDecl(node: Ballerina.STNode): node is Ballerina.LocalVarDecl {
        return node.kind === "LocalVarDecl";
    }

    public static isLockKeyword(node: Ballerina.STNode): node is Ballerina.LockKeyword {
        return node.kind === "LockKeyword";
    }

    public static isLockStatement(node: Ballerina.STNode): node is Ballerina.LockStatement {
        return node.kind === "LockStatement";
    }

    public static isLogicalAndToken(node: Ballerina.STNode): node is Ballerina.LogicalAndToken {
        return node.kind === "LogicalAndToken";
    }

    public static isLogicalOrToken(node: Ballerina.STNode): node is Ballerina.LogicalOrToken {
        return node.kind === "LogicalOrToken";
    }

    public static isLtEqualToken(node: Ballerina.STNode): node is Ballerina.LtEqualToken {
        return node.kind === "LtEqualToken";
    }

    public static isLtToken(node: Ballerina.STNode): node is Ballerina.LtToken {
        return node.kind === "LtToken";
    }

    public static isMapKeyword(node: Ballerina.STNode): node is Ballerina.MapKeyword {
        return node.kind === "MapKeyword";
    }

    public static isMapTypeDesc(node: Ballerina.STNode): node is Ballerina.MapTypeDesc {
        return node.kind === "MapTypeDesc";
    }

    public static isMappingBindingPattern(node: Ballerina.STNode): node is Ballerina.MappingBindingPattern {
        return node.kind === "MappingBindingPattern";
    }

    public static isMappingConstructor(node: Ballerina.STNode): node is Ballerina.MappingConstructor {
        return node.kind === "MappingConstructor";
    }

    public static isMappingMatchPattern(node: Ballerina.STNode): node is Ballerina.MappingMatchPattern {
        return node.kind === "MappingMatchPattern";
    }

    public static isMarkdownCodeBlock(node: Ballerina.STNode): node is Ballerina.MarkdownCodeBlock {
        return node.kind === "MarkdownCodeBlock";
    }

    public static isMarkdownCodeLine(node: Ballerina.STNode): node is Ballerina.MarkdownCodeLine {
        return node.kind === "MarkdownCodeLine";
    }

    public static isMarkdownDeprecationDocumentationLine(node: Ballerina.STNode): node is Ballerina.MarkdownDeprecationDocumentationLine {
        return node.kind === "MarkdownDeprecationDocumentationLine";
    }

    public static isMarkdownDocumentation(node: Ballerina.STNode): node is Ballerina.MarkdownDocumentation {
        return node.kind === "MarkdownDocumentation";
    }

    public static isMarkdownDocumentationLine(node: Ballerina.STNode): node is Ballerina.MarkdownDocumentationLine {
        return node.kind === "MarkdownDocumentationLine";
    }

    public static isMarkdownParameterDocumentationLine(node: Ballerina.STNode): node is Ballerina.MarkdownParameterDocumentationLine {
        return node.kind === "MarkdownParameterDocumentationLine";
    }

    public static isMarkdownReferenceDocumentationLine(node: Ballerina.STNode): node is Ballerina.MarkdownReferenceDocumentationLine {
        return node.kind === "MarkdownReferenceDocumentationLine";
    }

    public static isMarkdownReturnParameterDocumentationLine(node: Ballerina.STNode): node is Ballerina.MarkdownReturnParameterDocumentationLine {
        return node.kind === "MarkdownReturnParameterDocumentationLine";
    }

    public static isMatchClause(node: Ballerina.STNode): node is Ballerina.MatchClause {
        return node.kind === "MatchClause";
    }

    public static isMatchGuard(node: Ballerina.STNode): node is Ballerina.MatchGuard {
        return node.kind === "MatchGuard";
    }

    public static isMatchKeyword(node: Ballerina.STNode): node is Ballerina.MatchKeyword {
        return node.kind === "MatchKeyword";
    }

    public static isMatchStatement(node: Ballerina.STNode): node is Ballerina.MatchStatement {
        return node.kind === "MatchStatement";
    }

    public static isMetadata(node: Ballerina.STNode): node is Ballerina.Metadata {
        return node.kind === "Metadata";
    }

    public static isMethodCall(node: Ballerina.STNode): node is Ballerina.MethodCall {
        return node.kind === "MethodCall";
    }

    public static isMethodDeclaration(node: Ballerina.STNode): node is Ballerina.MethodDeclaration {
        return node.kind === "MethodDeclaration";
    }

    public static isMinusToken(node: Ballerina.STNode): node is Ballerina.MinusToken {
        return node.kind === "MinusToken";
    }

    public static isModulePart(node: Ballerina.STNode): node is Ballerina.ModulePart {
        return node.kind === "ModulePart";
    }

    public static isModuleVarDecl(node: Ballerina.STNode): node is Ballerina.ModuleVarDecl {
        return node.kind === "ModuleVarDecl";
    }

    public static isModuleXmlNamespaceDeclaration(node: Ballerina.STNode): node is Ballerina.ModuleXmlNamespaceDeclaration {
        return node.kind === "ModuleXmlNamespaceDeclaration";
    }

    public static isNamedArg(node: Ballerina.STNode): node is Ballerina.NamedArg {
        return node.kind === "NamedArg";
    }

    public static isNamedArgBindingPattern(node: Ballerina.STNode): node is Ballerina.NamedArgBindingPattern {
        return node.kind === "NamedArgBindingPattern";
    }

    public static isNamedArgMatchPattern(node: Ballerina.STNode): node is Ballerina.NamedArgMatchPattern {
        return node.kind === "NamedArgMatchPattern";
    }

    public static isNamedWorkerDeclaration(node: Ballerina.STNode): node is Ballerina.NamedWorkerDeclaration {
        return node.kind === "NamedWorkerDeclaration";
    }

    public static isNamedWorkerDeclarator(node: Ballerina.STNode): node is Ballerina.NamedWorkerDeclarator {
        return node.kind === "NamedWorkerDeclarator";
    }

    public static isNegationToken(node: Ballerina.STNode): node is Ballerina.NegationToken {
        return node.kind === "NegationToken";
    }

    public static isNeverKeyword(node: Ballerina.STNode): node is Ballerina.NeverKeyword {
        return node.kind === "NeverKeyword";
    }

    public static isNeverTypeDesc(node: Ballerina.STNode): node is Ballerina.NeverTypeDesc {
        return node.kind === "NeverTypeDesc";
    }

    public static isNewKeyword(node: Ballerina.STNode): node is Ballerina.NewKeyword {
        return node.kind === "NewKeyword";
    }

    public static isNilLiteral(node: Ballerina.STNode): node is Ballerina.NilLiteral {
        return node.kind === "NilLiteral";
    }

    public static isNilTypeDesc(node: Ballerina.STNode): node is Ballerina.NilTypeDesc {
        return node.kind === "NilTypeDesc";
    }

    public static isNotDoubleEqualToken(node: Ballerina.STNode): node is Ballerina.NotDoubleEqualToken {
        return node.kind === "NotDoubleEqualToken";
    }

    public static isNotEqualToken(node: Ballerina.STNode): node is Ballerina.NotEqualToken {
        return node.kind === "NotEqualToken";
    }

    public static isNotIsKeyword(node: Ballerina.STNode): node is Ballerina.NotIsKeyword {
        return node.kind === "NotIsKeyword";
    }

    public static isNullKeyword(node: Ballerina.STNode): node is Ballerina.NullKeyword {
        return node.kind === "NullKeyword";
    }

    public static isNullLiteral(node: Ballerina.STNode): node is Ballerina.NullLiteral {
        return node.kind === "NullLiteral";
    }

    public static isNumericLiteral(node: Ballerina.STNode): node is Ballerina.NumericLiteral {
        return node.kind === "NumericLiteral";
    }

    public static isObjectConstructor(node: Ballerina.STNode): node is Ballerina.ObjectConstructor {
        return node.kind === "ObjectConstructor";
    }

    public static isObjectField(node: Ballerina.STNode): node is Ballerina.ObjectField {
        return node.kind === "ObjectField";
    }

    public static isObjectKeyword(node: Ballerina.STNode): node is Ballerina.ObjectKeyword {
        return node.kind === "ObjectKeyword";
    }

    public static isObjectMethodDefinition(node: Ballerina.STNode): node is Ballerina.ObjectMethodDefinition {
        return node.kind === "ObjectMethodDefinition";
    }

    public static isObjectTypeDesc(node: Ballerina.STNode): node is Ballerina.ObjectTypeDesc {
        return node.kind === "ObjectTypeDesc";
    }

    public static isOnClause(node: Ballerina.STNode): node is Ballerina.OnClause {
        return node.kind === "OnClause";
    }

    public static isOnConflictClause(node: Ballerina.STNode): node is Ballerina.OnConflictClause {
        return node.kind === "OnConflictClause";
    }

    public static isOnFailClause(node: Ballerina.STNode): node is Ballerina.OnFailClause {
        return node.kind === "OnFailClause";
    }

    public static isOnKeyword(node: Ballerina.STNode): node is Ballerina.OnKeyword {
        return node.kind === "OnKeyword";
    }

    public static isOpenBracePipeToken(node: Ballerina.STNode): node is Ballerina.OpenBracePipeToken {
        return node.kind === "OpenBracePipeToken";
    }

    public static isOpenBraceToken(node: Ballerina.STNode): node is Ballerina.OpenBraceToken {
        return node.kind === "OpenBraceToken";
    }

    public static isOpenBracketToken(node: Ballerina.STNode): node is Ballerina.OpenBracketToken {
        return node.kind === "OpenBracketToken";
    }

    public static isOpenParenToken(node: Ballerina.STNode): node is Ballerina.OpenParenToken {
        return node.kind === "OpenParenToken";
    }

    public static isOptionalChainingToken(node: Ballerina.STNode): node is Ballerina.OptionalChainingToken {
        return node.kind === "OptionalChainingToken";
    }

    public static isOptionalFieldAccess(node: Ballerina.STNode): node is Ballerina.OptionalFieldAccess {
        return node.kind === "OptionalFieldAccess";
    }

    public static isOptionalTypeDesc(node: Ballerina.STNode): node is Ballerina.OptionalTypeDesc {
        return node.kind === "OptionalTypeDesc";
    }

    public static isOrderByClause(node: Ballerina.STNode): node is Ballerina.OrderByClause {
        return node.kind === "OrderByClause";
    }

    public static isOrderKey(node: Ballerina.STNode): node is Ballerina.OrderKey {
        return node.kind === "OrderKey";
    }

    public static isOrderKeyword(node: Ballerina.STNode): node is Ballerina.OrderKeyword {
        return node.kind === "OrderKeyword";
    }

    public static isOuterKeyword(node: Ballerina.STNode): node is Ballerina.OuterKeyword {
        return node.kind === "OuterKeyword";
    }

    public static isPanicKeyword(node: Ballerina.STNode): node is Ballerina.PanicKeyword {
        return node.kind === "PanicKeyword";
    }

    public static isPanicStatement(node: Ballerina.STNode): node is Ballerina.PanicStatement {
        return node.kind === "PanicStatement";
    }

    public static isParameterDocReferenceToken(node: Ballerina.STNode): node is Ballerina.ParameterDocReferenceToken {
        return node.kind === "ParameterDocReferenceToken";
    }

    public static isParameterKeyword(node: Ballerina.STNode): node is Ballerina.ParameterKeyword {
        return node.kind === "ParameterKeyword";
    }

    public static isParameterName(node: Ballerina.STNode): node is Ballerina.ParameterName {
        return node.kind === "ParameterName";
    }

    public static isParenthesisedTypeDesc(node: Ballerina.STNode): node is Ballerina.ParenthesisedTypeDesc {
        return node.kind === "ParenthesisedTypeDesc";
    }

    public static isParenthesizedArgList(node: Ballerina.STNode): node is Ballerina.ParenthesizedArgList {
        return node.kind === "ParenthesizedArgList";
    }

    public static isPercentToken(node: Ballerina.STNode): node is Ballerina.PercentToken {
        return node.kind === "PercentToken";
    }

    public static isPipeToken(node: Ballerina.STNode): node is Ballerina.PipeToken {
        return node.kind === "PipeToken";
    }

    public static isPlusToken(node: Ballerina.STNode): node is Ballerina.PlusToken {
        return node.kind === "PlusToken";
    }

    public static isPositionalArg(node: Ballerina.STNode): node is Ballerina.PositionalArg {
        return node.kind === "PositionalArg";
    }

    public static isPrivateKeyword(node: Ballerina.STNode): node is Ballerina.PrivateKeyword {
        return node.kind === "PrivateKeyword";
    }

    public static isPublicKeyword(node: Ballerina.STNode): node is Ballerina.PublicKeyword {
        return node.kind === "PublicKeyword";
    }

    public static isQualifiedNameReference(node: Ballerina.STNode): node is Ballerina.QualifiedNameReference {
        return node.kind === "QualifiedNameReference";
    }

    public static isQueryAction(node: Ballerina.STNode): node is Ballerina.QueryAction {
        return node.kind === "QueryAction";
    }

    public static isQueryConstructType(node: Ballerina.STNode): node is Ballerina.QueryConstructType {
        return node.kind === "QueryConstructType";
    }

    public static isQueryExpression(node: Ballerina.STNode): node is Ballerina.QueryExpression {
        return node.kind === "QueryExpression";
    }

    public static isQueryPipeline(node: Ballerina.STNode): node is Ballerina.QueryPipeline {
        return node.kind === "QueryPipeline";
    }

    public static isQuestionMarkToken(node: Ballerina.STNode): node is Ballerina.QuestionMarkToken {
        return node.kind === "QuestionMarkToken";
    }

    public static isRawTemplateExpression(node: Ballerina.STNode): node is Ballerina.RawTemplateExpression {
        return node.kind === "RawTemplateExpression";
    }

    public static isReAssertion(node: Ballerina.STNode): node is Ballerina.ReAssertion {
        return node.kind === "ReAssertion";
    }

    public static isReAssertionValue(node: Ballerina.STNode): node is Ballerina.ReAssertionValue {
        return node.kind === "ReAssertionValue";
    }

    public static isReAtomQuantifier(node: Ballerina.STNode): node is Ballerina.ReAtomQuantifier {
        return node.kind === "ReAtomQuantifier";
    }

    public static isReBaseQuantifierValue(node: Ballerina.STNode): node is Ballerina.ReBaseQuantifierValue {
        return node.kind === "ReBaseQuantifierValue";
    }

    public static isReBracedQuantifier(node: Ballerina.STNode): node is Ballerina.ReBracedQuantifier {
        return node.kind === "ReBracedQuantifier";
    }

    public static isReBracedQuantifierDigit(node: Ballerina.STNode): node is Ballerina.ReBracedQuantifierDigit {
        return node.kind === "ReBracedQuantifierDigit";
    }

    public static isReCapturingGroup(node: Ballerina.STNode): node is Ballerina.ReCapturingGroup {
        return node.kind === "ReCapturingGroup";
    }

    public static isReChar(node: Ballerina.STNode): node is Ballerina.ReChar {
        return node.kind === "ReChar";
    }

    public static isReCharEscape(node: Ballerina.STNode): node is Ballerina.ReCharEscape {
        return node.kind === "ReCharEscape";
    }

    public static isReCharSetAtom(node: Ballerina.STNode): node is Ballerina.ReCharSetAtom {
        return node.kind === "ReCharSetAtom";
    }

    public static isReCharSetAtomNoDash(node: Ballerina.STNode): node is Ballerina.ReCharSetAtomNoDash {
        return node.kind === "ReCharSetAtomNoDash";
    }

    public static isReCharSetAtomNoDashWithReCharSetNoDash(node: Ballerina.STNode): node is Ballerina.ReCharSetAtomNoDashWithReCharSetNoDash {
        return node.kind === "ReCharSetAtomNoDashWithReCharSetNoDash";
    }

    public static isReCharSetAtomWithReCharSetNoDash(node: Ballerina.STNode): node is Ballerina.ReCharSetAtomWithReCharSetNoDash {
        return node.kind === "ReCharSetAtomWithReCharSetNoDash";
    }

    public static isReCharSetRange(node: Ballerina.STNode): node is Ballerina.ReCharSetRange {
        return node.kind === "ReCharSetRange";
    }

    public static isReCharSetRangeLhsCharSetAtom(node: Ballerina.STNode): node is Ballerina.ReCharSetRangeLhsCharSetAtom {
        return node.kind === "ReCharSetRangeLhsCharSetAtom";
    }

    public static isReCharSetRangeNoDash(node: Ballerina.STNode): node is Ballerina.ReCharSetRangeNoDash {
        return node.kind === "ReCharSetRangeNoDash";
    }

    public static isReCharSetRangeNoDashLhsCharSetAtomNoDash(node: Ballerina.STNode): node is Ballerina.ReCharSetRangeNoDashLhsCharSetAtomNoDash {
        return node.kind === "ReCharSetRangeNoDashLhsCharSetAtomNoDash";
    }

    public static isReCharSetRangeNoDashWithReCharSet(node: Ballerina.STNode): node is Ballerina.ReCharSetRangeNoDashWithReCharSet {
        return node.kind === "ReCharSetRangeNoDashWithReCharSet";
    }

    public static isReCharSetRangeWithReCharSet(node: Ballerina.STNode): node is Ballerina.ReCharSetRangeWithReCharSet {
        return node.kind === "ReCharSetRangeWithReCharSet";
    }

    public static isReCharacterClass(node: Ballerina.STNode): node is Ballerina.ReCharacterClass {
        return node.kind === "ReCharacterClass";
    }

    public static isReEscape(node: Ballerina.STNode): node is Ballerina.ReEscape {
        return node.kind === "ReEscape";
    }

    public static isReFlagExpr(node: Ballerina.STNode): node is Ballerina.ReFlagExpr {
        return node.kind === "ReFlagExpr";
    }

    public static isReFlags(node: Ballerina.STNode): node is Ballerina.ReFlags {
        return node.kind === "ReFlags";
    }

    public static isReFlagsOnOff(node: Ballerina.STNode): node is Ballerina.ReFlagsOnOff {
        return node.kind === "ReFlagsOnOff";
    }

    public static isReFlagsValue(node: Ballerina.STNode): node is Ballerina.ReFlagsValue {
        return node.kind === "ReFlagsValue";
    }

    public static isReKeyword(node: Ballerina.STNode): node is Ballerina.ReKeyword {
        return node.kind === "ReKeyword";
    }

    public static isReProperty(node: Ballerina.STNode): node is Ballerina.ReProperty {
        return node.kind === "ReProperty";
    }

    public static isReQuantifier(node: Ballerina.STNode): node is Ballerina.ReQuantifier {
        return node.kind === "ReQuantifier";
    }

    public static isReQuoteEscape(node: Ballerina.STNode): node is Ballerina.ReQuoteEscape {
        return node.kind === "ReQuoteEscape";
    }

    public static isReSequence(node: Ballerina.STNode): node is Ballerina.ReSequence {
        return node.kind === "ReSequence";
    }

    public static isReSimpleCharClassCode(node: Ballerina.STNode): node is Ballerina.ReSimpleCharClassCode {
        return node.kind === "ReSimpleCharClassCode";
    }

    public static isReSimpleCharClassEscape(node: Ballerina.STNode): node is Ballerina.ReSimpleCharClassEscape {
        return node.kind === "ReSimpleCharClassEscape";
    }

    public static isReSyntaxChar(node: Ballerina.STNode): node is Ballerina.ReSyntaxChar {
        return node.kind === "ReSyntaxChar";
    }

    public static isReUnicodeGeneralCategory(node: Ballerina.STNode): node is Ballerina.ReUnicodeGeneralCategory {
        return node.kind === "ReUnicodeGeneralCategory";
    }

    public static isReUnicodeGeneralCategoryName(node: Ballerina.STNode): node is Ballerina.ReUnicodeGeneralCategoryName {
        return node.kind === "ReUnicodeGeneralCategoryName";
    }

    public static isReUnicodeGeneralCategoryStart(node: Ballerina.STNode): node is Ballerina.ReUnicodeGeneralCategoryStart {
        return node.kind === "ReUnicodeGeneralCategoryStart";
    }

    public static isReUnicodePropertyEscape(node: Ballerina.STNode): node is Ballerina.ReUnicodePropertyEscape {
        return node.kind === "ReUnicodePropertyEscape";
    }

    public static isReUnicodePropertyValue(node: Ballerina.STNode): node is Ballerina.ReUnicodePropertyValue {
        return node.kind === "ReUnicodePropertyValue";
    }

    public static isReUnicodeScript(node: Ballerina.STNode): node is Ballerina.ReUnicodeScript {
        return node.kind === "ReUnicodeScript";
    }

    public static isReUnicodeScriptStart(node: Ballerina.STNode): node is Ballerina.ReUnicodeScriptStart {
        return node.kind === "ReUnicodeScriptStart";
    }

    public static isReadonlyKeyword(node: Ballerina.STNode): node is Ballerina.ReadonlyKeyword {
        return node.kind === "ReadonlyKeyword";
    }

    public static isReadonlyTypeDesc(node: Ballerina.STNode): node is Ballerina.ReadonlyTypeDesc {
        return node.kind === "ReadonlyTypeDesc";
    }

    public static isReceiveAction(node: Ballerina.STNode): node is Ballerina.ReceiveAction {
        return node.kind === "ReceiveAction";
    }

    public static isReceiveFields(node: Ballerina.STNode): node is Ballerina.ReceiveFields {
        return node.kind === "ReceiveFields";
    }

    public static isRecordField(node: Ballerina.STNode): node is Ballerina.RecordField {
        return node.kind === "RecordField";
    }

    public static isRecordFieldWithDefaultValue(node: Ballerina.STNode): node is Ballerina.RecordFieldWithDefaultValue {
        return node.kind === "RecordFieldWithDefaultValue";
    }

    public static isRecordKeyword(node: Ballerina.STNode): node is Ballerina.RecordKeyword {
        return node.kind === "RecordKeyword";
    }

    public static isRecordRestType(node: Ballerina.STNode): node is Ballerina.RecordRestType {
        return node.kind === "RecordRestType";
    }

    public static isRecordTypeDesc(node: Ballerina.STNode): node is Ballerina.RecordTypeDesc {
        return node.kind === "RecordTypeDesc";
    }

    public static isRegexTemplateExpression(node: Ballerina.STNode): node is Ballerina.RegexTemplateExpression {
        return node.kind === "RegexTemplateExpression";
    }

    public static isRemoteKeyword(node: Ballerina.STNode): node is Ballerina.RemoteKeyword {
        return node.kind === "RemoteKeyword";
    }

    public static isRemoteMethodCallAction(node: Ballerina.STNode): node is Ballerina.RemoteMethodCallAction {
        return node.kind === "RemoteMethodCallAction";
    }

    public static isRequiredExpression(node: Ballerina.STNode): node is Ballerina.RequiredExpression {
        return node.kind === "RequiredExpression";
    }

    public static isRequiredParam(node: Ballerina.STNode): node is Ballerina.RequiredParam {
        return node.kind === "RequiredParam";
    }

    public static isResourceAccessRestSegment(node: Ballerina.STNode): node is Ballerina.ResourceAccessRestSegment {
        return node.kind === "ResourceAccessRestSegment";
    }

    public static isResourceAccessorDeclaration(node: Ballerina.STNode): node is Ballerina.ResourceAccessorDeclaration {
        return node.kind === "ResourceAccessorDeclaration";
    }

    public static isResourceAccessorDefinition(node: Ballerina.STNode): node is Ballerina.ResourceAccessorDefinition {
        return node.kind === "ResourceAccessorDefinition";
    }

    public static isResourceKeyword(node: Ballerina.STNode): node is Ballerina.ResourceKeyword {
        return node.kind === "ResourceKeyword";
    }

    public static isResourcePathRestParam(node: Ballerina.STNode): node is Ballerina.ResourcePathRestParam {
        return node.kind === "ResourcePathRestParam";
    }

    public static isResourcePathSegmentParam(node: Ballerina.STNode): node is Ballerina.ResourcePathSegmentParam {
        return node.kind === "ResourcePathSegmentParam";
    }

    public static isRestArg(node: Ballerina.STNode): node is Ballerina.RestArg {
        return node.kind === "RestArg";
    }

    public static isRestBindingPattern(node: Ballerina.STNode): node is Ballerina.RestBindingPattern {
        return node.kind === "RestBindingPattern";
    }

    public static isRestMatchPattern(node: Ballerina.STNode): node is Ballerina.RestMatchPattern {
        return node.kind === "RestMatchPattern";
    }

    public static isRestParam(node: Ballerina.STNode): node is Ballerina.RestParam {
        return node.kind === "RestParam";
    }

    public static isRestType(node: Ballerina.STNode): node is Ballerina.RestType {
        return node.kind === "RestType";
    }

    public static isRetryKeyword(node: Ballerina.STNode): node is Ballerina.RetryKeyword {
        return node.kind === "RetryKeyword";
    }

    public static isRetryStatement(node: Ballerina.STNode): node is Ballerina.RetryStatement {
        return node.kind === "RetryStatement";
    }

    public static isReturnKeyword(node: Ballerina.STNode): node is Ballerina.ReturnKeyword {
        return node.kind === "ReturnKeyword";
    }

    public static isReturnStatement(node: Ballerina.STNode): node is Ballerina.ReturnStatement {
        return node.kind === "ReturnStatement";
    }

    public static isReturnTypeDescriptor(node: Ballerina.STNode): node is Ballerina.ReturnTypeDescriptor {
        return node.kind === "ReturnTypeDescriptor";
    }

    public static isReturnsKeyword(node: Ballerina.STNode): node is Ballerina.ReturnsKeyword {
        return node.kind === "ReturnsKeyword";
    }

    public static isRightArrowToken(node: Ballerina.STNode): node is Ballerina.RightArrowToken {
        return node.kind === "RightArrowToken";
    }

    public static isRightDoubleArrowToken(node: Ballerina.STNode): node is Ballerina.RightDoubleArrowToken {
        return node.kind === "RightDoubleArrowToken";
    }

    public static isRollbackKeyword(node: Ballerina.STNode): node is Ballerina.RollbackKeyword {
        return node.kind === "RollbackKeyword";
    }

    public static isRollbackStatement(node: Ballerina.STNode): node is Ballerina.RollbackStatement {
        return node.kind === "RollbackStatement";
    }

    public static isSelectClause(node: Ballerina.STNode): node is Ballerina.SelectClause {
        return node.kind === "SelectClause";
    }

    public static isSelectKeyword(node: Ballerina.STNode): node is Ballerina.SelectKeyword {
        return node.kind === "SelectKeyword";
    }

    public static isSemicolonToken(node: Ballerina.STNode): node is Ballerina.SemicolonToken {
        return node.kind === "SemicolonToken";
    }

    public static isServiceDeclaration(node: Ballerina.STNode): node is Ballerina.ServiceDeclaration {
        return node.kind === "ServiceDeclaration";
    }

    public static isServiceDocReferenceToken(node: Ballerina.STNode): node is Ballerina.ServiceDocReferenceToken {
        return node.kind === "ServiceDocReferenceToken";
    }

    public static isServiceKeyword(node: Ballerina.STNode): node is Ballerina.ServiceKeyword {
        return node.kind === "ServiceKeyword";
    }

    public static isSimpleNameReference(node: Ballerina.STNode): node is Ballerina.SimpleNameReference {
        return node.kind === "SimpleNameReference";
    }

    public static isSingleQuoteToken(node: Ballerina.STNode): node is Ballerina.SingleQuoteToken {
        return node.kind === "SingleQuoteToken";
    }

    public static isSingletonTypeDesc(node: Ballerina.STNode): node is Ballerina.SingletonTypeDesc {
        return node.kind === "SingletonTypeDesc";
    }

    public static isSlashAsteriskToken(node: Ballerina.STNode): node is Ballerina.SlashAsteriskToken {
        return node.kind === "SlashAsteriskToken";
    }

    public static isSlashLtToken(node: Ballerina.STNode): node is Ballerina.SlashLtToken {
        return node.kind === "SlashLtToken";
    }

    public static isSlashToken(node: Ballerina.STNode): node is Ballerina.SlashToken {
        return node.kind === "SlashToken";
    }

    public static isSourceKeyword(node: Ballerina.STNode): node is Ballerina.SourceKeyword {
        return node.kind === "SourceKeyword";
    }

    public static isSpecificField(node: Ballerina.STNode): node is Ballerina.SpecificField {
        return node.kind === "SpecificField";
    }

    public static isSpreadField(node: Ballerina.STNode): node is Ballerina.SpreadField {
        return node.kind === "SpreadField";
    }

    public static isSpreadMember(node: Ballerina.STNode): node is Ballerina.SpreadMember {
        return node.kind === "SpreadMember";
    }

    public static isStartAction(node: Ballerina.STNode): node is Ballerina.StartAction {
        return node.kind === "StartAction";
    }

    public static isStartKeyword(node: Ballerina.STNode): node is Ballerina.StartKeyword {
        return node.kind === "StartKeyword";
    }

    public static isStreamKeyword(node: Ballerina.STNode): node is Ballerina.StreamKeyword {
        return node.kind === "StreamKeyword";
    }

    public static isStreamTypeDesc(node: Ballerina.STNode): node is Ballerina.StreamTypeDesc {
        return node.kind === "StreamTypeDesc";
    }

    public static isStreamTypeParams(node: Ballerina.STNode): node is Ballerina.StreamTypeParams {
        return node.kind === "StreamTypeParams";
    }

    public static isStringKeyword(node: Ballerina.STNode): node is Ballerina.StringKeyword {
        return node.kind === "StringKeyword";
    }

    public static isStringLiteral(node: Ballerina.STNode): node is Ballerina.StringLiteral {
        return node.kind === "StringLiteral";
    }

    public static isStringLiteralToken(node: Ballerina.STNode): node is Ballerina.StringLiteralToken {
        return node.kind === "StringLiteralToken";
    }

    public static isStringTemplateExpression(node: Ballerina.STNode): node is Ballerina.StringTemplateExpression {
        return node.kind === "StringTemplateExpression";
    }

    public static isStringTypeDesc(node: Ballerina.STNode): node is Ballerina.StringTypeDesc {
        return node.kind === "StringTypeDesc";
    }

    public static isSyncSendAction(node: Ballerina.STNode): node is Ballerina.SyncSendAction {
        return node.kind === "SyncSendAction";
    }

    public static isSyncSendToken(node: Ballerina.STNode): node is Ballerina.SyncSendToken {
        return node.kind === "SyncSendToken";
    }

    public static isTableConstructor(node: Ballerina.STNode): node is Ballerina.TableConstructor {
        return node.kind === "TableConstructor";
    }

    public static isTableKeyword(node: Ballerina.STNode): node is Ballerina.TableKeyword {
        return node.kind === "TableKeyword";
    }

    public static isTableTypeDesc(node: Ballerina.STNode): node is Ballerina.TableTypeDesc {
        return node.kind === "TableTypeDesc";
    }

    public static isTemplateString(node: Ballerina.STNode): node is Ballerina.TemplateString {
        return node.kind === "TemplateString";
    }

    public static isTransactionKeyword(node: Ballerina.STNode): node is Ballerina.TransactionKeyword {
        return node.kind === "TransactionKeyword";
    }

    public static isTransactionStatement(node: Ballerina.STNode): node is Ballerina.TransactionStatement {
        return node.kind === "TransactionStatement";
    }

    public static isTransactionalExpression(node: Ballerina.STNode): node is Ballerina.TransactionalExpression {
        return node.kind === "TransactionalExpression";
    }

    public static isTransactionalKeyword(node: Ballerina.STNode): node is Ballerina.TransactionalKeyword {
        return node.kind === "TransactionalKeyword";
    }

    public static isTrapAction(node: Ballerina.STNode): node is Ballerina.TrapAction {
        return node.kind === "TrapAction";
    }

    public static isTrapExpression(node: Ballerina.STNode): node is Ballerina.TrapExpression {
        return node.kind === "TrapExpression";
    }

    public static isTrapKeyword(node: Ballerina.STNode): node is Ballerina.TrapKeyword {
        return node.kind === "TrapKeyword";
    }

    public static isTripleBacktickToken(node: Ballerina.STNode): node is Ballerina.TripleBacktickToken {
        return node.kind === "TripleBacktickToken";
    }

    public static isTrippleEqualToken(node: Ballerina.STNode): node is Ballerina.TrippleEqualToken {
        return node.kind === "TrippleEqualToken";
    }

    public static isTrippleGtToken(node: Ballerina.STNode): node is Ballerina.TrippleGtToken {
        return node.kind === "TrippleGtToken";
    }

    public static isTrueKeyword(node: Ballerina.STNode): node is Ballerina.TrueKeyword {
        return node.kind === "TrueKeyword";
    }

    public static isTupleTypeDesc(node: Ballerina.STNode): node is Ballerina.TupleTypeDesc {
        return node.kind === "TupleTypeDesc";
    }

    public static isTypeCastExpression(node: Ballerina.STNode): node is Ballerina.TypeCastExpression {
        return node.kind === "TypeCastExpression";
    }

    public static isTypeCastParam(node: Ballerina.STNode): node is Ballerina.TypeCastParam {
        return node.kind === "TypeCastParam";
    }

    public static isTypeDefinition(node: Ballerina.STNode): node is Ballerina.TypeDefinition {
        return node.kind === "TypeDefinition";
    }

    public static isTypeDocReferenceToken(node: Ballerina.STNode): node is Ballerina.TypeDocReferenceToken {
        return node.kind === "TypeDocReferenceToken";
    }

    public static isTypeKeyword(node: Ballerina.STNode): node is Ballerina.TypeKeyword {
        return node.kind === "TypeKeyword";
    }

    public static isTypeParameter(node: Ballerina.STNode): node is Ballerina.TypeParameter {
        return node.kind === "TypeParameter";
    }

    public static isTypeReference(node: Ballerina.STNode): node is Ballerina.TypeReference {
        return node.kind === "TypeReference";
    }

    public static isTypeTestExpression(node: Ballerina.STNode): node is Ballerina.TypeTestExpression {
        return node.kind === "TypeTestExpression";
    }

    public static isTypedBindingPattern(node: Ballerina.STNode): node is Ballerina.TypedBindingPattern {
        return node.kind === "TypedBindingPattern";
    }

    public static isTypedescKeyword(node: Ballerina.STNode): node is Ballerina.TypedescKeyword {
        return node.kind === "TypedescKeyword";
    }

    public static isTypedescTypeDesc(node: Ballerina.STNode): node is Ballerina.TypedescTypeDesc {
        return node.kind === "TypedescTypeDesc";
    }

    public static isTypeofExpression(node: Ballerina.STNode): node is Ballerina.TypeofExpression {
        return node.kind === "TypeofExpression";
    }

    public static isTypeofKeyword(node: Ballerina.STNode): node is Ballerina.TypeofKeyword {
        return node.kind === "TypeofKeyword";
    }

    public static isUnaryExpression(node: Ballerina.STNode): node is Ballerina.UnaryExpression {
        return node.kind === "UnaryExpression";
    }

    public static isUnderscoreKeyword(node: Ballerina.STNode): node is Ballerina.UnderscoreKeyword {
        return node.kind === "UnderscoreKeyword";
    }

    public static isUnionTypeDesc(node: Ballerina.STNode): node is Ballerina.UnionTypeDesc {
        return node.kind === "UnionTypeDesc";
    }

    public static isVarDocReferenceToken(node: Ballerina.STNode): node is Ballerina.VarDocReferenceToken {
        return node.kind === "VarDocReferenceToken";
    }

    public static isVarKeyword(node: Ballerina.STNode): node is Ballerina.VarKeyword {
        return node.kind === "VarKeyword";
    }

    public static isVarTypeDesc(node: Ballerina.STNode): node is Ballerina.VarTypeDesc {
        return node.kind === "VarTypeDesc";
    }

    public static isVariableDocReferenceToken(node: Ballerina.STNode): node is Ballerina.VariableDocReferenceToken {
        return node.kind === "VariableDocReferenceToken";
    }

    public static isWaitAction(node: Ballerina.STNode): node is Ballerina.WaitAction {
        return node.kind === "WaitAction";
    }

    public static isWaitField(node: Ballerina.STNode): node is Ballerina.WaitField {
        return node.kind === "WaitField";
    }

    public static isWaitFieldsList(node: Ballerina.STNode): node is Ballerina.WaitFieldsList {
        return node.kind === "WaitFieldsList";
    }

    public static isWaitKeyword(node: Ballerina.STNode): node is Ballerina.WaitKeyword {
        return node.kind === "WaitKeyword";
    }

    public static isWhereClause(node: Ballerina.STNode): node is Ballerina.WhereClause {
        return node.kind === "WhereClause";
    }

    public static isWhereKeyword(node: Ballerina.STNode): node is Ballerina.WhereKeyword {
        return node.kind === "WhereKeyword";
    }

    public static isWhileKeyword(node: Ballerina.STNode): node is Ballerina.WhileKeyword {
        return node.kind === "WhileKeyword";
    }

    public static isWhileStatement(node: Ballerina.STNode): node is Ballerina.WhileStatement {
        return node.kind === "WhileStatement";
    }

    public static isWildcardBindingPattern(node: Ballerina.STNode): node is Ballerina.WildcardBindingPattern {
        return node.kind === "WildcardBindingPattern";
    }

    public static isWorkerKeyword(node: Ballerina.STNode): node is Ballerina.WorkerKeyword {
        return node.kind === "WorkerKeyword";
    }

    public static isXmlAtomicNamePattern(node: Ballerina.STNode): node is Ballerina.XmlAtomicNamePattern {
        return node.kind === "XmlAtomicNamePattern";
    }

    public static isXmlAttribute(node: Ballerina.STNode): node is Ballerina.XmlAttribute {
        return node.kind === "XmlAttribute";
    }

    public static isXmlAttributeValue(node: Ballerina.STNode): node is Ballerina.XmlAttributeValue {
        return node.kind === "XmlAttributeValue";
    }

    public static isXmlCdata(node: Ballerina.STNode): node is Ballerina.XmlCdata {
        return node.kind === "XmlCdata";
    }

    public static isXmlCdataEndToken(node: Ballerina.STNode): node is Ballerina.XmlCdataEndToken {
        return node.kind === "XmlCdataEndToken";
    }

    public static isXmlCdataStartToken(node: Ballerina.STNode): node is Ballerina.XmlCdataStartToken {
        return node.kind === "XmlCdataStartToken";
    }

    public static isXmlComment(node: Ballerina.STNode): node is Ballerina.XmlComment {
        return node.kind === "XmlComment";
    }

    public static isXmlCommentEndToken(node: Ballerina.STNode): node is Ballerina.XmlCommentEndToken {
        return node.kind === "XmlCommentEndToken";
    }

    public static isXmlCommentStartToken(node: Ballerina.STNode): node is Ballerina.XmlCommentStartToken {
        return node.kind === "XmlCommentStartToken";
    }

    public static isXmlElement(node: Ballerina.STNode): node is Ballerina.XmlElement {
        return node.kind === "XmlElement";
    }

    public static isXmlElementEndTag(node: Ballerina.STNode): node is Ballerina.XmlElementEndTag {
        return node.kind === "XmlElementEndTag";
    }

    public static isXmlElementStartTag(node: Ballerina.STNode): node is Ballerina.XmlElementStartTag {
        return node.kind === "XmlElementStartTag";
    }

    public static isXmlEmptyElement(node: Ballerina.STNode): node is Ballerina.XmlEmptyElement {
        return node.kind === "XmlEmptyElement";
    }

    public static isXmlFilterExpression(node: Ballerina.STNode): node is Ballerina.XmlFilterExpression {
        return node.kind === "XmlFilterExpression";
    }

    public static isXmlKeyword(node: Ballerina.STNode): node is Ballerina.XmlKeyword {
        return node.kind === "XmlKeyword";
    }

    public static isXmlNamePatternChain(node: Ballerina.STNode): node is Ballerina.XmlNamePatternChain {
        return node.kind === "XmlNamePatternChain";
    }

    public static isXmlNamespaceDeclaration(node: Ballerina.STNode): node is Ballerina.XmlNamespaceDeclaration {
        return node.kind === "XmlNamespaceDeclaration";
    }

    public static isXmlPi(node: Ballerina.STNode): node is Ballerina.XmlPi {
        return node.kind === "XmlPi";
    }

    public static isXmlPiEndToken(node: Ballerina.STNode): node is Ballerina.XmlPiEndToken {
        return node.kind === "XmlPiEndToken";
    }

    public static isXmlPiStartToken(node: Ballerina.STNode): node is Ballerina.XmlPiStartToken {
        return node.kind === "XmlPiStartToken";
    }

    public static isXmlQualifiedName(node: Ballerina.STNode): node is Ballerina.XmlQualifiedName {
        return node.kind === "XmlQualifiedName";
    }

    public static isXmlSimpleName(node: Ballerina.STNode): node is Ballerina.XmlSimpleName {
        return node.kind === "XmlSimpleName";
    }

    public static isXmlStepExpression(node: Ballerina.STNode): node is Ballerina.XmlStepExpression {
        return node.kind === "XmlStepExpression";
    }

    public static isXmlTemplateExpression(node: Ballerina.STNode): node is Ballerina.XmlTemplateExpression {
        return node.kind === "XmlTemplateExpression";
    }

    public static isXmlText(node: Ballerina.STNode): node is Ballerina.XmlText {
        return node.kind === "XmlText";
    }

    public static isXmlTextContent(node: Ballerina.STNode): node is Ballerina.XmlTextContent {
        return node.kind === "XmlTextContent";
    }

    public static isXmlTypeDesc(node: Ballerina.STNode): node is Ballerina.XmlTypeDesc {
        return node.kind === "XmlTypeDesc";
    }

    public static isXmlnsKeyword(node: Ballerina.STNode): node is Ballerina.XmlnsKeyword {
        return node.kind === "XmlnsKeyword";
    }
}
