// This is an auto-generated file. Do not edit.
// Run 'BALLERINA_HOME="your/ballerina/home" npm run gen-models' to generate.
// eslint-disable ban-types

export interface VisibleEndpoint {
    kind?: string;
    isCaller: boolean;
    isExternal: boolean;
    isModuleVar: boolean;
    moduleName: string;
    name: string;
    packageName: string;
    orgName: string;
    version: string;
    typeName: string;
    position: NodePosition;
    viewState?: any;
    isParameter?: boolean;
    isClassField?: boolean;
  }
  
  export interface NodePosition {
    startLine?: number;
    startColumn?: number;
    endLine?: number;
    endColumn?: number;
  }
  
  export interface Minutiae {
    isInvalid: boolean;
    kind: string;
    minutiae: string;
  }
  
  export interface ControlFlow {
    isReached?: boolean;
    isCompleted?: boolean;
    numberOfIterations?: number;
    executionTime?: number;
  }
  
  export interface SyntaxDiagnostics {
    diagnosticInfo: DiagnosticInfo;
    message: string;
  }
  
  export interface Diagnostic {
    diagnosticInfo: DiagnosticInfo;
    message: string;
  }
  
  export interface DiagnosticInfo {
    code: string;
    severity: string;
  }
  
  export interface PerfData {
    concurrency?: string;
    latency: string;
    tps?: string;
    analyzeType?: string;
  }
  
  export interface STNode {
    kind: string;
    value?: any;
    parent?: STNode;
    viewState?: any;
    dataMapperViewState?: any;
    dataMapperTypeDescNode?: STNode;
    position?: any;
    typeData?: any;
    VisibleEndpoints?: VisibleEndpoint[];
    source: string;
    configurablePosition?: NodePosition;
    controlFlow?: ControlFlow;
    syntaxDiagnostics: SyntaxDiagnostics[];
    diagnostics?: Diagnostic[];
    performance?: PerfData;
    leadingMinutiae: Minutiae[];
    trailingMinutiae: Minutiae[];
    isInSelectedPath?: boolean;
    qualifiers?: STNode[];
    typedBindingPattern?: TypedBindingPattern;
  }
  
  export interface ActionStatement extends STNode {
    expression:
        | AsyncSendAction
        | CheckAction
        | ClientResourceAccessAction
        | FlushAction
        | QueryAction
        | ReceiveAction
        | RemoteMethodCallAction
        | StartAction
        | SyncSendAction
        | WaitAction;
    semicolonToken: SemicolonToken;
  }
  
  export interface AnnotAccess extends STNode {
    annotChainingToken: AnnotChainingToken;
    annotTagReference: QualifiedNameReference | SimpleNameReference;
    expression: BracedExpression | SimpleNameReference;
  }
  
  export interface AnnotChainingToken extends STNode {
    isMissing: boolean;
    isToken: boolean;
    value: string;
  }
  
  export interface Annotation extends STNode {
    annotReference: QualifiedNameReference | SimpleNameReference;
    annotValue?: MappingConstructor;
    atToken: AtToken;
  }
  
  export interface AnnotationAttachPoint extends STNode {
    identifiers: (
        | AnnotationKeyword
        | ClassKeyword
        | ConstKeyword
        | ExternalKeyword
        | FieldKeyword
        | FunctionKeyword
        | ListenerKeyword
        | ObjectKeyword
        | ParameterKeyword
        | RecordKeyword
        | ReturnKeyword
        | ServiceKeyword
        | TypeKeyword
        | VarKeyword
        | WorkerKeyword
    )[];
    sourceKeyword?: SourceKeyword;
  }
  
  export interface AnnotationDeclaration extends STNode {
    annotationKeyword: AnnotationKeyword;
    annotationTag: IdentifierToken;
    attachPoints: (AnnotationAttachPoint | CommaToken)[];
    constKeyword?: ConstKeyword;
    metadata?: Metadata;
    onKeyword?: OnKeyword;
    semicolonToken: SemicolonToken;
    typeDescriptor?: ArrayTypeDesc | IntTypeDesc | MapTypeDesc | RecordTypeDesc | SimpleNameReference;
    visibilityQualifier?: PublicKeyword;
  }
  
  export interface AnnotationDocReferenceToken extends STNode {
    isMissing: boolean;
    isToken: boolean;
    value: string;
  }
  
  export interface AnnotationKeyword extends STNode {
    isMissing: boolean;
    isToken: boolean;
    value: string;
  }
  
  export interface AnyKeyword extends STNode {
    isMissing: boolean;
    isToken: boolean;
    value: string;
  }
  
  export interface AnyTypeDesc extends STNode {
    name: AnyKeyword;
  }
  
  export interface AnydataKeyword extends STNode {
    isMissing: boolean;
    isToken: boolean;
    value: string;
  }
  
  export interface AnydataTypeDesc extends STNode {
    name: AnydataKeyword;
  }
  
  export interface ArrayDimension extends STNode {
    arrayLength?: AsteriskLiteral | NumericLiteral | QualifiedNameReference | SimpleNameReference;
    closeBracket: CloseBracketToken;
    openBracket: OpenBracketToken;
  }
  
  export interface ArrayTypeDesc extends STNode {
    dimensions: ArrayDimension[];
    memberTypeDesc:
        | AnyTypeDesc
        | AnydataTypeDesc
        | BooleanTypeDesc
        | ByteTypeDesc
        | DecimalTypeDesc
        | ErrorTypeDesc
        | FloatTypeDesc
        | FunctionTypeDesc
        | FutureTypeDesc
        | HandleTypeDesc
        | IntTypeDesc
        | JsonTypeDesc
        | MapTypeDesc
        | NeverTypeDesc
        | NilTypeDesc
        | ObjectTypeDesc
        | OptionalTypeDesc
        | ParenthesisedTypeDesc
        | QualifiedNameReference
        | RecordTypeDesc
        | SimpleNameReference
        | SingletonTypeDesc
        | StreamTypeDesc
        | StringTypeDesc
        | TableTypeDesc
        | TupleTypeDesc
        | TypedescTypeDesc
        | XmlTypeDesc;
  }
  
  export interface AsKeyword extends STNode {
    isMissing: boolean;
    isToken: boolean;
    value: string;
  }
  
  export interface AscendingKeyword extends STNode {
    isMissing: boolean;
    isToken: boolean;
    value: string;
  }
  
  export interface AssignmentStatement extends STNode {
    equalsToken: EqualToken;
    expression:
        | AnnotAccess
        | BinaryExpression
        | BooleanLiteral
        | BracedAction
        | BracedExpression
        | ByteArrayLiteral
        | CheckAction
        | CheckExpression
        | ClientResourceAccessAction
        | ConditionalExpression
        | ErrorConstructor
        | ExplicitAnonymousFunctionExpression
        | ExplicitNewExpression
        | FieldAccess
        | FunctionCall
        | ImplicitAnonymousFunctionExpression
        | ImplicitNewExpression
        | IndexedExpression
        | IntTypeDesc
        | LetExpression
        | ListConstructor
        | MappingConstructor
        | MethodCall
        | NilLiteral
        | NullLiteral
        | NumericLiteral
        | ObjectConstructor
        | OptionalFieldAccess
        | QualifiedNameReference
        | QueryAction
        | QueryExpression
        | RawTemplateExpression
        | ReceiveAction
        | RegexTemplateExpression
        | RemoteMethodCallAction
        | SimpleNameReference
        | StartAction
        | StringLiteral
        | StringTemplateExpression
        | SyncSendAction
        | TableConstructor
        | TrapExpression
        | TypeCastExpression
        | TypeTestExpression
        | TypeofExpression
        | UnaryExpression
        | WaitAction
        | XmlFilterExpression
        | XmlStepExpression
        | XmlTemplateExpression;
    semicolonToken: SemicolonToken;
    varRef:
        | ErrorBindingPattern
        | FieldAccess
        | IndexedExpression
        | ListBindingPattern
        | MappingBindingPattern
        | QualifiedNameReference
        | SimpleNameReference
        | WildcardBindingPattern;
  }
  
  export interface AsteriskLiteral extends STNode {
    literalToken: AsteriskToken;
  }
  
  export interface AsteriskToken extends STNode {
    isMissing: boolean;
    isToken: boolean;
    value: string;
  }
  
  export interface AsyncSendAction extends STNode {
    expression: BinaryExpression | BracedExpression | NumericLiteral | SimpleNameReference | StringLiteral;
    peerWorker: SimpleNameReference;
    rightArrowToken: RightArrowToken;
  }
  
  export interface AtToken extends STNode {
    isMissing: boolean;
    isToken: boolean;
    value: string;
  }
  
  export interface BackSlashToken extends STNode {
    isMissing: boolean;
    isToken: boolean;
    value: string;
  }
  
  export interface BacktickToken extends STNode {
    isMissing: boolean;
    isToken: boolean;
    value: string;
  }
  
  export interface BallerinaNameReference extends STNode {
    endBacktick: BacktickToken;
    nameReference: CodeContent | FunctionCall | MethodCall | QualifiedNameReference | SimpleNameReference;
    referenceType:
        | AnnotationDocReferenceToken
        | ConstDocReferenceToken
        | FunctionDocReferenceToken
        | ParameterDocReferenceToken
        | ServiceDocReferenceToken
        | TypeDocReferenceToken
        | VarDocReferenceToken
        | VariableDocReferenceToken;
    startBacktick: BacktickToken;
  }
  
  export interface Base16Keyword extends STNode {
    isMissing: boolean;
    isToken: boolean;
    value: string;
  }
  
  export interface Base64Keyword extends STNode {
    isMissing: boolean;
    isToken: boolean;
    value: string;
  }
  
  export interface BinaryExpression extends STNode {
    lhsExpr:
        | BinaryExpression
        | BooleanLiteral
        | BracedExpression
        | ByteArrayLiteral
        | CheckExpression
        | FieldAccess
        | FunctionCall
        | IndexedExpression
        | ListConstructor
        | MappingConstructor
        | MethodCall
        | NilLiteral
        | NullLiteral
        | NumericLiteral
        | ObjectConstructor
        | OptionalFieldAccess
        | QualifiedNameReference
        | RegexTemplateExpression
        | SimpleNameReference
        | StringLiteral
        | StringTemplateExpression
        | StringTypeDesc
        | TableConstructor
        | TypeCastExpression
        | TypeTestExpression
        | TypeofExpression
        | UnaryExpression
        | XmlStepExpression
        | XmlTemplateExpression;
    operator:
        | AsteriskToken
        | BitwiseAndToken
        | BitwiseXorToken
        | DoubleDotLtToken
        | DoubleEqualToken
        | DoubleGtToken
        | DoubleLtToken
        | EllipsisToken
        | ElvisToken
        | GtEqualToken
        | GtToken
        | LogicalAndToken
        | LogicalOrToken
        | LtEqualToken
        | LtToken
        | MinusToken
        | NotDoubleEqualToken
        | NotEqualToken
        | PercentToken
        | PipeToken
        | PlusToken
        | SlashToken
        | TrippleEqualToken
        | TrippleGtToken;
    rhsExpr:
        | BinaryExpression
        | BooleanLiteral
        | BracedExpression
        | CheckExpression
        | ErrorConstructor
        | ExplicitAnonymousFunctionExpression
        | FieldAccess
        | FunctionCall
        | ImplicitAnonymousFunctionExpression
        | IndexedExpression
        | LetExpression
        | ListConstructor
        | MappingConstructor
        | MethodCall
        | NilLiteral
        | NullLiteral
        | NumericLiteral
        | ObjectConstructor
        | QualifiedNameReference
        | QueryExpression
        | RegexTemplateExpression
        | SimpleNameReference
        | StringLiteral
        | StringTemplateExpression
        | TableConstructor
        | TypeCastExpression
        | TypeTestExpression
        | TypeofExpression
        | UnaryExpression
        | XmlFilterExpression
        | XmlTemplateExpression;
  }
  
  export interface BitwiseAndToken extends STNode {
    isMissing: boolean;
    isToken: boolean;
    value: string;
  }
  
  export interface BitwiseXorToken extends STNode {
    isMissing: boolean;
    isToken: boolean;
    value: string;
  }
  
  export interface BlockStatement extends STNode {
    VisibleEndpoints?: any[];
    closeBraceToken: CloseBraceToken;
    openBraceToken: OpenBraceToken;
    statements: (
        | ActionStatement
        | AssignmentStatement
        | BlockStatement
        | BreakStatement
        | CallStatement
        | CompoundAssignmentStatement
        | ContinueStatement
        | DoStatement
        | FailStatement
        | ForeachStatement
        | ForkStatement
        | IfElseStatement
        | InvalidExpressionStatement
        | LocalVarDecl
        | LockStatement
        | MatchStatement
        | PanicStatement
        | RetryStatement
        | ReturnStatement
        | RollbackStatement
        | WhileStatement
        | XmlNamespaceDeclaration
    )[];
  }
  
  export interface BooleanKeyword extends STNode {
    isMissing: boolean;
    isToken: boolean;
    value: string;
  }
  
  export interface BooleanLiteral extends STNode {
    literalToken: FalseKeyword | TrueKeyword;
  }
  
  export interface BooleanTypeDesc extends STNode {
    name: BooleanKeyword;
  }
  
  export interface BracedAction extends STNode {
    closeParen: CloseParenToken;
    expression: CheckAction | ClientResourceAccessAction | QueryAction | RemoteMethodCallAction | StartAction | TrapAction | WaitAction;
    openParen: OpenParenToken;
  }
  
  export interface BracedExpression extends STNode {
    closeParen: CloseParenToken;
    expression:
        | BinaryExpression
        | BooleanLiteral
        | BracedExpression
        | ByteArrayLiteral
        | CheckExpression
        | ConditionalExpression
        | ErrorConstructor
        | ExplicitNewExpression
        | FieldAccess
        | FunctionCall
        | ImplicitAnonymousFunctionExpression
        | IndexedExpression
        | IntTypeDesc
        | LetExpression
        | ListConstructor
        | MappingConstructor
        | MethodCall
        | NumericLiteral
        | OptionalFieldAccess
        | QualifiedNameReference
        | QueryExpression
        | RawTemplateExpression
        | SimpleNameReference
        | StringLiteral
        | StringTemplateExpression
        | TableConstructor
        | TrapExpression
        | TypeCastExpression
        | TypeTestExpression
        | TypeofExpression
        | UnaryExpression
        | XmlFilterExpression
        | XmlStepExpression
        | XmlTemplateExpression;
    openParen: OpenParenToken;
  }
  
  export interface BreakKeyword extends STNode {
    isMissing: boolean;
    isToken: boolean;
    value: string;
  }
  
  export interface BreakStatement extends STNode {
    breakToken: BreakKeyword;
    semicolonToken: SemicolonToken;
  }
  
  export interface ByKeyword extends STNode {
    isMissing: boolean;
    isToken: boolean;
    value: string;
  }
  
  export interface ByteArrayLiteral extends STNode {
    content?: TemplateString;
    endBacktick: BacktickToken;
    startBacktick: BacktickToken;
    type: Base16Keyword | Base64Keyword;
  }
  
  export interface ByteKeyword extends STNode {
    isMissing: boolean;
    isToken: boolean;
    value: string;
  }
  
  export interface ByteTypeDesc extends STNode {
    name: ByteKeyword;
  }
  
  export interface CallStatement extends STNode {
    expression: CheckExpression | FunctionCall | MethodCall;
    semicolonToken: SemicolonToken;
  }
  
  export interface CaptureBindingPattern extends STNode {
    variableName: IdentifierToken;
  }
  
  export interface CheckAction extends STNode {
    checkKeyword: CheckKeyword | CheckpanicKeyword;
    expression: BracedAction | ClientResourceAccessAction | CommitAction | QueryAction | ReceiveAction | RemoteMethodCallAction | TrapAction | WaitAction;
  }
  
  export interface CheckExpression extends STNode {
    checkKeyword: CheckKeyword | CheckpanicKeyword;
    expression:
        | BooleanLiteral
        | BracedExpression
        | CheckExpression
        | ErrorConstructor
        | ExplicitNewExpression
        | FieldAccess
        | FunctionCall
        | ImplicitNewExpression
        | IndexedExpression
        | LetExpression
        | ListConstructor
        | MappingConstructor
        | MethodCall
        | NilLiteral
        | NumericLiteral
        | OptionalFieldAccess
        | QueryExpression
        | SimpleNameReference
        | StringTemplateExpression
        | TrapExpression
        | TypeCastExpression;
  }
  
  export interface CheckKeyword extends STNode {
    isMissing: boolean;
    isToken: boolean;
    value: string;
  }
  
  export interface CheckpanicKeyword extends STNode {
    isMissing: boolean;
    isToken: boolean;
    value: string;
  }
  
  export interface ClassDefinition extends STNode {
    classKeyword: ClassKeyword;
    className: IdentifierToken;
    classTypeQualifiers: (ClientKeyword | DistinctKeyword | IsolatedKeyword | ReadonlyKeyword | ServiceKeyword)[];
    closeBrace: CloseBraceToken;
    members: (ObjectField | ObjectMethodDefinition | ResourceAccessorDefinition | TypeReference)[];
    metadata?: Metadata;
    openBrace: OpenBraceToken;
    visibilityQualifier?: PublicKeyword;
  }
  
  export interface ClassKeyword extends STNode {
    isMissing: boolean;
    isToken: boolean;
    value: string;
  }
  
  export interface ClientKeyword extends STNode {
    isMissing: boolean;
    isToken: boolean;
    value: string;
  }
  
  export interface ClientResourceAccessAction extends STNode {
    arguments?: ParenthesizedArgList;
    dotToken?: DotToken;
    expression: QualifiedNameReference | SimpleNameReference;
    methodName?: SimpleNameReference;
    resourceAccessPath: (ComputedResourceAccessSegment | IdentifierToken | ResourceAccessRestSegment | SlashToken)[];
    rightArrowToken: RightArrowToken;
    slashToken: SlashToken;
  }
  
  export interface CloseBracePipeToken extends STNode {
    isMissing: boolean;
    isToken: boolean;
    value: string;
  }
  
  export interface CloseBraceToken extends STNode {
    isMissing: boolean;
    isToken: boolean;
    value: string;
  }
  
  export interface CloseBracketToken extends STNode {
    isMissing: boolean;
    isToken: boolean;
    value: string;
  }
  
  export interface CloseParenToken extends STNode {
    isMissing: boolean;
    isToken: boolean;
    value: string;
  }
  
  export interface CodeContent extends STNode {
    isMissing: boolean;
    isToken: boolean;
    value: string;
  }
  
  export interface ColonToken extends STNode {
    isMissing: boolean;
    isToken: boolean;
    value: string;
  }
  
  export interface CommaToken extends STNode {
    isMissing: boolean;
    isToken: boolean;
    value: string;
  }
  
  export interface CommitAction extends STNode {
    commitKeyword: CommitKeyword;
  }
  
  export interface CommitKeyword extends STNode {
    isMissing: boolean;
    isToken: boolean;
    value: string;
  }
  
  export interface CompoundAssignmentStatement extends STNode {
    binaryOperator:
        | AsteriskToken
        | BitwiseAndToken
        | BitwiseXorToken
        | DoubleGtToken
        | DoubleLtToken
        | MinusToken
        | PipeToken
        | PlusToken
        | SlashToken
        | TrippleGtToken;
    equalsToken: EqualToken;
    lhsExpression: FieldAccess | IndexedExpression | SimpleNameReference;
    rhsExpression:
        | BinaryExpression
        | BracedExpression
        | CheckExpression
        | ConditionalExpression
        | FieldAccess
        | FunctionCall
        | IndexedExpression
        | LetExpression
        | MethodCall
        | NumericLiteral
        | SimpleNameReference
        | StringLiteral
        | TypeCastExpression;
    semicolonToken: SemicolonToken;
  }
  
  export interface ComputedNameField extends STNode {
    closeBracket: CloseBracketToken;
    colonToken: ColonToken;
    fieldNameExpr: BinaryExpression | FunctionCall | QualifiedNameReference | SimpleNameReference | StringTemplateExpression;
    openBracket: OpenBracketToken;
    valueExpr:
        | BinaryExpression
        | BooleanLiteral
        | FieldAccess
        | FunctionCall
        | MappingConstructor
        | NumericLiteral
        | SimpleNameReference
        | StringLiteral
        | StringTemplateExpression;
  }
  
  export interface ComputedResourceAccessSegment extends STNode {
    closeBracketToken: CloseBracketToken;
    expression:
        | BinaryExpression
        | BooleanLiteral
        | FieldAccess
        | FunctionCall
        | NumericLiteral
        | QualifiedNameReference
        | SimpleNameReference
        | StringLiteral;
    openBracketToken: OpenBracketToken;
  }
  
  export interface ConditionalExpression extends STNode {
    colonToken: ColonToken;
    endExpression:
        | BinaryExpression
        | BooleanLiteral
        | BracedExpression
        | ConditionalExpression
        | ExplicitNewExpression
        | FieldAccess
        | FunctionCall
        | ListConstructor
        | MappingConstructor
        | MethodCall
        | NilLiteral
        | NullLiteral
        | NumericLiteral
        | SimpleNameReference
        | StringLiteral
        | TrapExpression
        | TypeCastExpression
        | UnaryExpression
        | XmlTemplateExpression;
    lhsExpression:
        | BinaryExpression
        | BooleanLiteral
        | BracedExpression
        | CheckExpression
        | FunctionCall
        | MethodCall
        | SimpleNameReference
        | TypeCastExpression
        | TypeTestExpression
        | UnaryExpression;
    middleExpression:
        | BinaryExpression
        | BooleanLiteral
        | BracedExpression
        | ConditionalExpression
        | ErrorConstructor
        | FieldAccess
        | FunctionCall
        | IndexedExpression
        | MappingConstructor
        | MethodCall
        | NilLiteral
        | NullLiteral
        | NumericLiteral
        | QueryExpression
        | SimpleNameReference
        | StringLiteral
        | StringTemplateExpression
        | TrapExpression
        | TypeCastExpression
        | UnaryExpression;
    questionMarkToken: QuestionMarkToken;
  }
  
  export interface ConfigurableKeyword extends STNode {
    isMissing: boolean;
    isToken: boolean;
    value: string;
  }
  
  export interface ConflictKeyword extends STNode {
    isMissing: boolean;
    isToken: boolean;
    value: string;
  }
  
  export interface ConstDeclaration extends STNode {
    constKeyword: ConstKeyword;
    equalsToken: EqualToken;
    initializer:
        | BinaryExpression
        | BooleanLiteral
        | BracedExpression
        | ImplicitNewExpression
        | MappingConstructor
        | NilLiteral
        | NumericLiteral
        | SimpleNameReference
        | StringLiteral
        | UnaryExpression;
    metadata?: Metadata;
    semicolonToken: SemicolonToken;
    typeDescriptor?:
        | BooleanTypeDesc
        | ByteTypeDesc
        | DecimalTypeDesc
        | FloatTypeDesc
        | IntTypeDesc
        | JsonTypeDesc
        | MapTypeDesc
        | NeverTypeDesc
        | NilTypeDesc
        | QualifiedNameReference
        | SimpleNameReference
        | StringTypeDesc;
    variableName: IdentifierToken;
    visibilityQualifier?: PublicKeyword;
  }
  
  export interface ConstDocReferenceToken extends STNode {
    isMissing: boolean;
    isToken: boolean;
    value: string;
  }
  
  export interface ConstKeyword extends STNode {
    isMissing: boolean;
    isToken: boolean;
    value: string;
  }
  
  export interface ContinueKeyword extends STNode {
    isMissing: boolean;
    isToken: boolean;
    value: string;
  }
  
  export interface ContinueStatement extends STNode {
    continueToken: ContinueKeyword;
    semicolonToken: SemicolonToken;
  }
  
  export interface DecimalFloatingPointLiteralToken extends STNode {
    isMissing: boolean;
    isToken: boolean;
    value: string;
  }
  
  export interface DecimalIntegerLiteralToken extends STNode {
    isMissing: boolean;
    isToken: boolean;
    value: string;
  }
  
  export interface DecimalKeyword extends STNode {
    isMissing: boolean;
    isToken: boolean;
    value: string;
  }
  
  export interface DecimalTypeDesc extends STNode {
    name: DecimalKeyword;
  }
  
  export interface DefaultableParam extends STNode {
    annotations: Annotation[];
    equalsToken: EqualToken;
    expression:
        | BinaryExpression
        | BooleanLiteral
        | BracedExpression
        | ErrorConstructor
        | ExplicitAnonymousFunctionExpression
        | ExplicitNewExpression
        | FieldAccess
        | FloatTypeDesc
        | FunctionCall
        | ImplicitAnonymousFunctionExpression
        | ImplicitNewExpression
        | InferredTypedescDefault
        | IntTypeDesc
        | ListConstructor
        | MappingConstructor
        | MethodCall
        | NilLiteral
        | NumericLiteral
        | ObjectConstructor
        | QualifiedNameReference
        | SimpleNameReference
        | StringLiteral
        | UnaryExpression
        | XmlTemplateExpression;
    paramName: IdentifierToken;
    typeName:
        | AnyTypeDesc
        | ArrayTypeDesc
        | BooleanTypeDesc
        | ByteTypeDesc
        | DecimalTypeDesc
        | ErrorTypeDesc
        | FloatTypeDesc
        | FunctionTypeDesc
        | HandleTypeDesc
        | IntTypeDesc
        | IntersectionTypeDesc
        | JsonTypeDesc
        | MapTypeDesc
        | NilTypeDesc
        | ObjectTypeDesc
        | OptionalTypeDesc
        | QualifiedNameReference
        | RecordTypeDesc
        | SimpleNameReference
        | SingletonTypeDesc
        | StringTypeDesc
        | TupleTypeDesc
        | TypedescTypeDesc
        | UnionTypeDesc
        | XmlTypeDesc;
  }
  
  export interface DeprecationLiteral extends STNode {
    isMissing: boolean;
    isToken: boolean;
    value: string;
  }
  
  export interface DescendingKeyword extends STNode {
    isMissing: boolean;
    isToken: boolean;
    value: string;
  }
  
  export interface DistinctKeyword extends STNode {
    isMissing: boolean;
    isToken: boolean;
    value: string;
  }
  
  export interface DistinctTypeDesc extends STNode {
    distinctKeyword: DistinctKeyword;
    typeDescriptor:
        | ErrorTypeDesc
        | IntTypeDesc
        | ObjectTypeDesc
        | ParenthesisedTypeDesc
        | QualifiedNameReference
        | ReadonlyTypeDesc
        | RecordTypeDesc
        | SimpleNameReference
        | TypedescTypeDesc;
  }
  
  export interface DoKeyword extends STNode {
    isMissing: boolean;
    isToken: boolean;
    value: string;
  }
  
  export interface DoStatement extends STNode {
    blockStatement: BlockStatement;
    doKeyword: DoKeyword;
    onFailClause?: OnFailClause;
  }
  
  export interface DocumentationDescription extends STNode {
    isMissing: boolean;
    isToken: boolean;
    value: string;
  }
  
  export interface DotLtToken extends STNode {
    isMissing: boolean;
    isToken: boolean;
    value: string;
  }
  
  export interface DotToken extends STNode {
    isMissing: boolean;
    isToken: boolean;
    value: string;
  }
  
  export interface DoubleBacktickToken extends STNode {
    isMissing: boolean;
    isToken: boolean;
    value: string;
  }
  
  export interface DoubleDotLtToken extends STNode {
    isMissing: boolean;
    isToken: boolean;
    value: string;
  }
  
  export interface DoubleEqualToken extends STNode {
    isMissing: boolean;
    isToken: boolean;
    value: string;
  }
  
  export interface DoubleGtToken extends STNode {
    isMissing: boolean;
    isToken: boolean;
    value: string;
  }
  
  export interface DoubleLtToken extends STNode {
    isMissing: boolean;
    isToken: boolean;
    value: string;
  }
  
  export interface DoubleQuoteToken extends STNode {
    isMissing: boolean;
    isToken: boolean;
    value: string;
  }
  
  export interface DoubleSlashDoubleAsteriskLtToken extends STNode {
    isMissing: boolean;
    isToken: boolean;
    value: string;
  }
  
  export interface EllipsisToken extends STNode {
    isMissing: boolean;
    isToken: boolean;
    value: string;
  }
  
  export interface ElseBlock extends STNode {
    elseBody: BlockStatement | IfElseStatement;
    elseKeyword: ElseKeyword;
  }
  
  export interface ElseKeyword extends STNode {
    isMissing: boolean;
    isToken: boolean;
    value: string;
  }
  
  export interface ElvisToken extends STNode {
    isMissing: boolean;
    isToken: boolean;
    value: string;
  }
  
  export interface EnumDeclaration extends STNode {
    closeBraceToken: CloseBraceToken;
    enumKeywordToken: EnumKeyword;
    enumMemberList: (CommaToken | EnumMember)[];
    identifier: IdentifierToken;
    metadata?: Metadata;
    openBraceToken: OpenBraceToken;
    qualifier?: PublicKeyword;
  }
  
  export interface EnumKeyword extends STNode {
    isMissing: boolean;
    isToken: boolean;
    value: string;
  }
  
  export interface EnumMember extends STNode {
    constExprNode?: BinaryExpression | NumericLiteral | SimpleNameReference | StringLiteral;
    equalToken?: EqualToken;
    identifier: IdentifierToken;
    metadata?: Metadata;
  }
  
  export interface EofToken extends STNode {
    isMissing: boolean;
    isToken: boolean;
    value: string;
  }
  
  export interface EqualToken extends STNode {
    isMissing: boolean;
    isToken: boolean;
    value: string;
  }
  
  export interface EqualsKeyword extends STNode {
    isMissing: boolean;
    isToken: boolean;
    value: string;
  }
  
  export interface ErrorBindingPattern extends STNode {
    argListBindingPatterns: (
        | CaptureBindingPattern
        | CommaToken
        | ErrorBindingPattern
        | NamedArgBindingPattern
        | RestBindingPattern
        | WildcardBindingPattern
    )[];
    closeParenthesis: CloseParenToken;
    errorKeyword: ErrorKeyword;
    openParenthesis: OpenParenToken;
    typeReference?: SimpleNameReference;
  }
  
  export interface ErrorConstructor extends STNode {
    arguments: (CommaToken | NamedArg | PositionalArg)[];
    closeParenToken: CloseParenToken;
    errorKeyword: ErrorKeyword;
    openParenToken: OpenParenToken;
    typeReference?: QualifiedNameReference | SimpleNameReference;
  }
  
  export interface ErrorKeyword extends STNode {
    isMissing: boolean;
    isToken: boolean;
    value: string;
  }
  
  export interface ErrorMatchPattern extends STNode {
    argListMatchPatternNode: (
        | CommaToken
        | ErrorMatchPattern
        | IdentifierToken
        | NamedArgMatchPattern
        | QualifiedNameReference
        | RestMatchPattern
        | SimpleNameReference
        | StringLiteral
        | TypedBindingPattern
    )[];
    closeParenthesisToken: CloseParenToken;
    errorKeyword: ErrorKeyword;
    openParenthesisToken: OpenParenToken;
    typeReference?: SimpleNameReference;
  }
  
  export interface ErrorTypeDesc extends STNode {
    keywordToken: ErrorKeyword;
    typeParamNode?: TypeParameter;
  }
  
  export interface ExclamationMarkToken extends STNode {
    isMissing: boolean;
    isToken: boolean;
    value: string;
  }
  
  export interface ExplicitAnonymousFunctionExpression extends STNode {
    annotations: Annotation[];
    functionBody: ExpressionFunctionBody | FunctionBodyBlock;
    functionKeyword: FunctionKeyword;
    functionSignature: FunctionSignature;
    qualifierList: IsolatedKeyword[];
  }
  
  export interface ExplicitNewExpression extends STNode {
    newKeyword: NewKeyword;
    parenthesizedArgList: ParenthesizedArgList;
    typeDescriptor: QualifiedNameReference | SimpleNameReference | StreamTypeDesc;
  }
  
  export interface ExpressionFunctionBody extends STNode {
    expression:
        | BinaryExpression
        | BooleanLiteral
        | CheckExpression
        | ConditionalExpression
        | ErrorConstructor
        | ExplicitAnonymousFunctionExpression
        | ExplicitNewExpression
        | FieldAccess
        | FunctionCall
        | ImplicitAnonymousFunctionExpression
        | ImplicitNewExpression
        | IntTypeDesc
        | LetExpression
        | ListConstructor
        | MappingConstructor
        | MethodCall
        | NilLiteral
        | NumericLiteral
        | ObjectConstructor
        | SimpleNameReference
        | StringLiteral
        | StringTemplateExpression
        | XmlTemplateExpression;
    rightDoubleArrow: RightDoubleArrowToken;
    semicolon?: SemicolonToken;
  }
  
  export interface ExternalFunctionBody extends STNode {
    annotations: Annotation[];
    equalsToken: EqualToken;
    externalKeyword: ExternalKeyword;
    semicolonToken: SemicolonToken;
  }
  
  export interface ExternalKeyword extends STNode {
    isMissing: boolean;
    isToken: boolean;
    value: string;
  }
  
  export interface FailKeyword extends STNode {
    isMissing: boolean;
    isToken: boolean;
    value: string;
  }
  
  export interface FailStatement extends STNode {
    expression: ErrorConstructor | FunctionCall | SimpleNameReference;
    failKeyword: FailKeyword;
    semicolonToken: SemicolonToken;
  }
  
  export interface FalseKeyword extends STNode {
    isMissing: boolean;
    isToken: boolean;
    value: string;
  }
  
  export interface FieldAccess extends STNode {
    dotToken: DotToken;
    expression:
        | BracedExpression
        | ExplicitNewExpression
        | FieldAccess
        | FunctionCall
        | IndexedExpression
        | MethodCall
        | OptionalFieldAccess
        | QualifiedNameReference
        | SimpleNameReference
        | XmlStepExpression;
    fieldName: QualifiedNameReference | SimpleNameReference;
  }
  
  export interface FieldBindingPattern extends STNode {
    bindingPattern?: CaptureBindingPattern | ErrorBindingPattern | ListBindingPattern | MappingBindingPattern | WildcardBindingPattern;
    colon?: ColonToken;
    variableName: SimpleNameReference;
  }
  
  export interface FieldKeyword extends STNode {
    isMissing: boolean;
    isToken: boolean;
    value: string;
  }
  
  export interface FieldMatchPattern extends STNode {
    colonToken: ColonToken;
    fieldNameNode: IdentifierToken;
    matchPattern:
        | BooleanLiteral
        | ListMatchPattern
        | MappingMatchPattern
        | NilLiteral
        | NumericLiteral
        | SimpleNameReference
        | StringLiteral
        | TypedBindingPattern;
  }
  
  export interface FinalKeyword extends STNode {
    isMissing: boolean;
    isToken: boolean;
    value: string;
  }
  
  export interface FloatKeyword extends STNode {
    isMissing: boolean;
    isToken: boolean;
    value: string;
  }
  
  export interface FloatTypeDesc extends STNode {
    name: FloatKeyword;
  }
  
  export interface FlushAction extends STNode {
    flushKeyword: FlushKeyword;
    peerWorker?: SimpleNameReference;
  }
  
  export interface FlushKeyword extends STNode {
    isMissing: boolean;
    isToken: boolean;
    value: string;
  }
  
  export interface ForeachKeyword extends STNode {
    isMissing: boolean;
    isToken: boolean;
    value: string;
  }
  
  export interface ForeachStatement extends STNode {
    actionOrExpressionNode:
        | BinaryExpression
        | FieldAccess
        | IndexedExpression
        | ListConstructor
        | MethodCall
        | SimpleNameReference
        | StringTypeDesc
        | WaitAction
        | XmlStepExpression;
    blockStatement: BlockStatement;
    forEachKeyword: ForeachKeyword;
    inKeyword: InKeyword;
    onFailClause?: OnFailClause;
    typedBindingPattern: TypedBindingPattern;
  }
  
  export interface ForkKeyword extends STNode {
    isMissing: boolean;
    isToken: boolean;
    value: string;
  }
  
  export interface ForkStatement extends STNode {
    closeBraceToken: CloseBraceToken;
    forkKeyword: ForkKeyword;
    namedWorkerDeclarations: NamedWorkerDeclaration[];
    openBraceToken: OpenBraceToken;
  }
  
  export interface FromClause extends STNode {
    expression:
        | AsyncSendAction
        | BinaryExpression
        | BracedAction
        | BracedExpression
        | CheckAction
        | CheckExpression
        | ClientResourceAccessAction
        | ExplicitNewExpression
        | FieldAccess
        | FunctionCall
        | ListConstructor
        | MethodCall
        | NumericLiteral
        | QueryAction
        | QueryExpression
        | ReceiveAction
        | RemoteMethodCallAction
        | SimpleNameReference
        | StartAction
        | SyncSendAction
        | TypeCastExpression
        | TypeTestExpression
        | WaitAction
        | XmlStepExpression;
    fromKeyword: FromKeyword;
    inKeyword: InKeyword;
    typedBindingPattern: TypedBindingPattern;
  }
  
  export interface FromKeyword extends STNode {
    isMissing: boolean;
    isToken: boolean;
    value: string;
  }
  
  export interface FunctionBodyBlock extends STNode {
    VisibleEndpoints?: any[];
    closeBraceToken: CloseBraceToken;
    namedWorkerDeclarator?: NamedWorkerDeclarator;
    openBraceToken: OpenBraceToken;
    semicolonToken?: SemicolonToken;
    statements: (
        | ActionStatement
        | AssignmentStatement
        | BlockStatement
        | BreakStatement
        | CallStatement
        | CompoundAssignmentStatement
        | ContinueStatement
        | DoStatement
        | FailStatement
        | ForeachStatement
        | ForkStatement
        | IfElseStatement
        | InvalidExpressionStatement
        | LocalVarDecl
        | LockStatement
        | MatchStatement
        | PanicStatement
        | RetryStatement
        | ReturnStatement
        | RollbackStatement
        | TransactionStatement
        | WhileStatement
        | XmlNamespaceDeclaration
    )[];
  }
  
  export interface FunctionCall extends STNode {
    arguments: (CommaToken | NamedArg | PositionalArg | RestArg)[];
    closeParenToken: CloseParenToken;
    functionName: QualifiedNameReference | SimpleNameReference;
    openParenToken: OpenParenToken;
  }
  
  export interface FunctionDefinition extends STNode {
    functionBody: ExpressionFunctionBody | ExternalFunctionBody | FunctionBodyBlock;
    functionKeyword: FunctionKeyword;
    functionName: IdentifierToken;
    functionSignature: FunctionSignature;
    metadata?: Metadata;
    qualifierList: (IsolatedKeyword | PublicKeyword | TransactionalKeyword)[];
    relativeResourcePath: any;
    isRunnable?: boolean;
    runArgs?: any[];
  }
  
  export interface FunctionDocReferenceToken extends STNode {
    isMissing: boolean;
    isToken: boolean;
    value: string;
  }
  
  export interface FunctionKeyword extends STNode {
    isMissing: boolean;
    isToken: boolean;
    value: string;
  }
  
  export interface FunctionSignature extends STNode {
    closeParenToken: CloseParenToken;
    openParenToken: OpenParenToken;
    parameters: (CommaToken | DefaultableParam | IncludedRecordParam | RequiredParam | RestParam)[];
    returnTypeDesc?: ReturnTypeDescriptor;
  }
  
  export interface FunctionTypeDesc extends STNode {
    functionKeyword: FunctionKeyword;
    functionSignature?: FunctionSignature;
    qualifierList: (IsolatedKeyword | TransactionalKeyword)[];
  }
  
  export interface FutureKeyword extends STNode {
    isMissing: boolean;
    isToken: boolean;
    value: string;
  }
  
  export interface FutureTypeDesc extends STNode {
    keywordToken: FutureKeyword;
    typeParamNode?: TypeParameter;
  }
  
  export interface GtEqualToken extends STNode {
    isMissing: boolean;
    isToken: boolean;
    value: string;
  }
  
  export interface GtToken extends STNode {
    isMissing: boolean;
    isToken: boolean;
    value: string;
  }
  
  export interface HandleKeyword extends STNode {
    isMissing: boolean;
    isToken: boolean;
    value: string;
  }
  
  export interface HandleTypeDesc extends STNode {
    name: HandleKeyword;
  }
  
  export interface HashToken extends STNode {
    isMissing: boolean;
    isToken: boolean;
    value: string;
  }
  
  export interface HexFloatingPointLiteralToken extends STNode {
    isMissing: boolean;
    isToken: boolean;
    value: string;
  }
  
  export interface HexIntegerLiteralToken extends STNode {
    isMissing: boolean;
    isToken: boolean;
    value: string;
  }
  
  export interface IdentifierToken extends STNode {
    isMissing: boolean;
    isToken: boolean;
    value: string;
  }
  
  export interface IfElseStatement extends STNode {
    condition:
        | BinaryExpression
        | BooleanLiteral
        | BracedExpression
        | CheckExpression
        | FunctionCall
        | LetExpression
        | ListConstructor
        | NilLiteral
        | NumericLiteral
        | SimpleNameReference
        | StringLiteral
        | TransactionalExpression
        | TrapExpression
        | TypeTestExpression
        | UnaryExpression;
    elseBody?: ElseBlock;
    ifBody: BlockStatement;
    ifKeyword: IfKeyword;
  }
  
  export interface IfKeyword extends STNode {
    isMissing: boolean;
    isToken: boolean;
    value: string;
  }
  
  export interface ImplicitAnonymousFunctionExpression extends STNode {
    expression:
        | BinaryExpression
        | BooleanLiteral
        | CheckExpression
        | ExplicitAnonymousFunctionExpression
        | FunctionCall
        | ImplicitAnonymousFunctionExpression
        | IndexedExpression
        | LetExpression
        | ListConstructor
        | MappingConstructor
        | MethodCall
        | NilLiteral
        | NumericLiteral
        | SimpleNameReference
        | StringLiteral
        | StringTemplateExpression
        | TypeTestExpression
        | UnaryExpression;
    params: InferParamList | SimpleNameReference;
    rightDoubleArrow: RightDoubleArrowToken;
  }
  
  export interface ImplicitNewExpression extends STNode {
    newKeyword: NewKeyword;
    parenthesizedArgList?: ParenthesizedArgList;
  }
  
  export interface ImportDeclaration extends STNode {
    importKeyword: ImportKeyword;
    moduleName: (DotToken | IdentifierToken)[];
    orgName?: ImportOrgName;
    prefix?: ImportPrefix;
    semicolon: SemicolonToken;
  }
  
  export interface ImportKeyword extends STNode {
    isMissing: boolean;
    isToken: boolean;
    value: string;
  }
  
  export interface ImportOrgName extends STNode {
    orgName: IdentifierToken;
    slashToken: SlashToken;
  }
  
  export interface ImportPrefix extends STNode {
    asKeyword: AsKeyword;
    prefix: IdentifierToken | UnderscoreKeyword;
  }
  
  export interface InKeyword extends STNode {
    isMissing: boolean;
    isToken: boolean;
    value: string;
  }
  
  export interface IncludedRecordParam extends STNode {
    annotations: any;
    asteriskToken: AsteriskToken;
    paramName: IdentifierToken;
    typeName: IntTypeDesc | SimpleNameReference;
  }
  
  export interface IndexedExpression extends STNode {
    closeBracket: CloseBracketToken;
    containerExpression:
        | BracedExpression
        | FieldAccess
        | FunctionCall
        | IndexedExpression
        | ListConstructor
        | MappingConstructor
        | MethodCall
        | OptionalFieldAccess
        | QualifiedNameReference
        | SimpleNameReference
        | StringLiteral
        | TableConstructor
        | XmlStepExpression;
    keyExpression: (
        | BinaryExpression
        | BooleanLiteral
        | BracedExpression
        | CommaToken
        | FieldAccess
        | FunctionCall
        | IndexedExpression
        | ListConstructor
        | MappingConstructor
        | MethodCall
        | NumericLiteral
        | QualifiedNameReference
        | SimpleNameReference
        | StringLiteral
        | StringTemplateExpression
        | TypeCastExpression
        | UnaryExpression
        | XmlTemplateExpression
    )[];
    openBracket: OpenBracketToken;
  }
  
  export interface InferParamList extends STNode {
    closeParenToken: CloseParenToken;
    openParenToken: OpenParenToken;
    parameters: (CommaToken | SimpleNameReference)[];
  }
  
  export interface InferredTypedescDefault extends STNode {
    gtToken: GtToken;
    ltToken: LtToken;
  }
  
  export interface InlineCodeReference extends STNode {
    codeReference: CodeContent;
    endBacktick: BacktickToken | DoubleBacktickToken | TripleBacktickToken;
    startBacktick: BacktickToken | DoubleBacktickToken | TripleBacktickToken;
  }
  
  export interface IntKeyword extends STNode {
    isMissing: boolean;
    isToken: boolean;
    value: string;
  }
  
  export interface IntTypeDesc extends STNode {
    name: IntKeyword;
  }
  
  export interface Interpolation extends STNode {
    expression:
        | BinaryExpression
        | BracedExpression
        | CheckExpression
        | ConditionalExpression
        | ExplicitNewExpression
        | FieldAccess
        | FunctionCall
        | IndexedExpression
        | LetExpression
        | MethodCall
        | NumericLiteral
        | QueryExpression
        | SimpleNameReference
        | StringLiteral
        | TypeCastExpression
        | XmlTemplateExpression;
    interpolationEndToken: CloseBraceToken;
    interpolationStartToken: InterpolationStartToken;
  }
  
  export interface InterpolationStartToken extends STNode {
    isMissing: boolean;
    isToken: boolean;
    value: string;
  }
  
  export interface IntersectionTypeDesc extends STNode {
    bitwiseAndToken: BitwiseAndToken;
    leftTypeDesc:
        | AnyTypeDesc
        | AnydataTypeDesc
        | ArrayTypeDesc
        | BooleanTypeDesc
        | DistinctTypeDesc
        | ErrorTypeDesc
        | FutureTypeDesc
        | IntTypeDesc
        | IntersectionTypeDesc
        | JsonTypeDesc
        | MapTypeDesc
        | NeverTypeDesc
        | NilTypeDesc
        | ObjectTypeDesc
        | OptionalTypeDesc
        | ParenthesisedTypeDesc
        | QualifiedNameReference
        | ReadonlyTypeDesc
        | RecordTypeDesc
        | SimpleNameReference
        | StringTypeDesc
        | TableTypeDesc
        | TupleTypeDesc
        | XmlTypeDesc;
    rightTypeDesc:
        | AnyTypeDesc
        | AnydataTypeDesc
        | ArrayTypeDesc
        | DistinctTypeDesc
        | ErrorTypeDesc
        | FunctionTypeDesc
        | IntTypeDesc
        | JsonTypeDesc
        | MapTypeDesc
        | NilTypeDesc
        | ObjectTypeDesc
        | OptionalTypeDesc
        | ParenthesisedTypeDesc
        | QualifiedNameReference
        | ReadonlyTypeDesc
        | RecordTypeDesc
        | SimpleNameReference
        | StringTypeDesc
        | TableTypeDesc
        | TupleTypeDesc
        | XmlTypeDesc;
  }
  
  export interface InvalidExpressionStatement extends STNode {
    expression:
        | BinaryExpression
        | BracedExpression
        | FieldAccess
        | ImplicitAnonymousFunctionExpression
        | IndexedExpression
        | ListConstructor
        | MappingConstructor
        | QueryExpression
        | SimpleNameReference
        | UnaryExpression
        | XmlTemplateExpression;
    semicolonToken: SemicolonToken;
  }
  
  export interface IsKeyword extends STNode {
    isMissing: boolean;
    isToken: boolean;
    value: string;
  }
  
  export interface IsolatedKeyword extends STNode {
    isMissing: boolean;
    isToken: boolean;
    value: string;
  }
  
  export interface JoinClause extends STNode {
    expression: BinaryExpression | BracedExpression | CheckExpression | ListConstructor | MethodCall | SimpleNameReference;
    inKeyword: InKeyword;
    joinKeyword: JoinKeyword;
    joinOnCondition: OnClause;
    outerKeyword?: OuterKeyword;
    typedBindingPattern: TypedBindingPattern;
  }
  
  export interface JoinKeyword extends STNode {
    isMissing: boolean;
    isToken: boolean;
    value: string;
  }
  
  export interface JsonKeyword extends STNode {
    isMissing: boolean;
    isToken: boolean;
    value: string;
  }
  
  export interface JsonTypeDesc extends STNode {
    name: JsonKeyword;
  }
  
  export interface KeyKeyword extends STNode {
    isMissing: boolean;
    isToken: boolean;
    value: string;
  }
  
  export interface KeySpecifier extends STNode {
    closeParenToken: CloseParenToken;
    fieldNames: (CommaToken | IdentifierToken)[];
    keyKeyword: KeyKeyword;
    openParenToken: OpenParenToken;
  }
  
  export interface KeyTypeConstraint extends STNode {
    keyKeywordToken: KeyKeyword;
    typeParameterNode: TypeParameter;
  }
  
  export interface LeftArrowToken extends STNode {
    isMissing: boolean;
    isToken: boolean;
    value: string;
  }
  
  export interface LetClause extends STNode {
    letKeyword: LetKeyword;
    letVarDeclarations: (CommaToken | LetVarDecl)[];
  }
  
  export interface LetExpression extends STNode {
    expression:
        | BinaryExpression
        | BracedExpression
        | ConditionalExpression
        | ExplicitAnonymousFunctionExpression
        | ExplicitNewExpression
        | FieldAccess
        | FunctionCall
        | ImplicitAnonymousFunctionExpression
        | ImplicitNewExpression
        | IndexedExpression
        | LetExpression
        | ListConstructor
        | MappingConstructor
        | MethodCall
        | NumericLiteral
        | ObjectConstructor
        | QueryExpression
        | SimpleNameReference
        | TypeCastExpression;
    inKeyword: InKeyword;
    letKeyword: LetKeyword;
    letVarDeclarations: (CommaToken | LetVarDecl)[];
  }
  
  export interface LetKeyword extends STNode {
    isMissing: boolean;
    isToken: boolean;
    value: string;
  }
  
  export interface LetVarDecl extends STNode {
    annotations: Annotation[];
    equalsToken: EqualToken;
    expression:
        | AsyncSendAction
        | BinaryExpression
        | BooleanLiteral
        | BracedAction
        | BracedExpression
        | CheckAction
        | CheckExpression
        | ClientResourceAccessAction
        | ErrorConstructor
        | ExplicitAnonymousFunctionExpression
        | ExplicitNewExpression
        | FieldAccess
        | FunctionCall
        | ImplicitNewExpression
        | IndexedExpression
        | ListConstructor
        | MappingConstructor
        | MethodCall
        | NilLiteral
        | NullLiteral
        | NumericLiteral
        | OptionalFieldAccess
        | QueryAction
        | QueryExpression
        | ReceiveAction
        | RemoteMethodCallAction
        | SimpleNameReference
        | StartAction
        | StringLiteral
        | SyncSendAction
        | TableConstructor
        | TrapAction
        | TrapExpression
        | TypeCastExpression
        | UnaryExpression
        | WaitAction
        | XmlTemplateExpression;
    typedBindingPattern: TypedBindingPattern;
  }
  
  export interface LimitClause extends STNode {
    expression: CheckExpression | FunctionCall | NumericLiteral | SimpleNameReference | UnaryExpression;
    limitKeyword: LimitKeyword;
  }
  
  export interface LimitKeyword extends STNode {
    isMissing: boolean;
    isToken: boolean;
    value: string;
  }
  
  export interface ListBindingPattern extends STNode {
    bindingPatterns: (
        | CaptureBindingPattern
        | CommaToken
        | ErrorBindingPattern
        | ListBindingPattern
        | MappingBindingPattern
        | RestBindingPattern
        | WildcardBindingPattern
    )[];
    closeBracket: CloseBracketToken;
    openBracket: OpenBracketToken;
  }
  
  export interface ListConstructor extends STNode {
    closeBracket: CloseBracketToken;
    expressions: (
        | AnyTypeDesc
        | BinaryExpression
        | BooleanLiteral
        | BooleanTypeDesc
        | BracedExpression
        | ByteTypeDesc
        | CheckExpression
        | CommaToken
        | ConditionalExpression
        | ErrorConstructor
        | ExplicitAnonymousFunctionExpression
        | ExplicitNewExpression
        | FieldAccess
        | FunctionCall
        | ImplicitNewExpression
        | IndexedExpression
        | IntTypeDesc
        | LetExpression
        | ListConstructor
        | MappingConstructor
        | MethodCall
        | NilLiteral
        | NullLiteral
        | NumericLiteral
        | ObjectConstructor
        | OptionalFieldAccess
        | QualifiedNameReference
        | SimpleNameReference
        | SpreadMember
        | StringLiteral
        | StringTemplateExpression
        | StringTypeDesc
        | TableConstructor
        | TrapExpression
        | TypeCastExpression
        | TypeTestExpression
        | TypeofExpression
        | UnaryExpression
        | XmlStepExpression
        | XmlTemplateExpression
    )[];
    openBracket: OpenBracketToken;
  }
  
  export interface ListMatchPattern extends STNode {
    closeBracket: CloseBracketToken;
    matchPatterns: (
        | BooleanLiteral
        | CommaToken
        | ErrorMatchPattern
        | ListMatchPattern
        | MappingMatchPattern
        | NumericLiteral
        | RestMatchPattern
        | SimpleNameReference
        | StringLiteral
        | TypedBindingPattern
    )[];
    openBracket: OpenBracketToken;
  }
  
  export interface ListenerDeclaration extends STNode {
    equalsToken: EqualToken;
    initializer: ExplicitNewExpression | ImplicitNewExpression | NilLiteral | NumericLiteral | ObjectConstructor | SimpleNameReference;
    listenerKeyword: ListenerKeyword;
    metadata?: Metadata;
    semicolonToken: SemicolonToken;
    typeDescriptor?: FunctionTypeDesc | ObjectTypeDesc | QualifiedNameReference | SimpleNameReference;
    variableName: IdentifierToken;
    visibilityQualifier?: PublicKeyword;
  }
  
  export interface ListenerKeyword extends STNode {
    isMissing: boolean;
    isToken: boolean;
    value: string;
  }
  
  export interface LocalVarDecl extends STNode {
    annotations: Annotation[];
    equalsToken?: EqualToken;
    finalKeyword?: FinalKeyword;
    initializer?:
        | AnnotAccess
        | AsyncSendAction
        | BinaryExpression
        | BooleanLiteral
        | BooleanTypeDesc
        | BracedAction
        | BracedExpression
        | ByteArrayLiteral
        | ByteTypeDesc
        | CheckAction
        | CheckExpression
        | ClientResourceAccessAction
        | CommitAction
        | ConditionalExpression
        | ErrorConstructor
        | ExplicitAnonymousFunctionExpression
        | ExplicitNewExpression
        | FieldAccess
        | FloatTypeDesc
        | FlushAction
        | FunctionCall
        | ImplicitAnonymousFunctionExpression
        | ImplicitNewExpression
        | IndexedExpression
        | IntTypeDesc
        | JsonTypeDesc
        | LetExpression
        | ListConstructor
        | MappingConstructor
        | MethodCall
        | NilLiteral
        | NullLiteral
        | NumericLiteral
        | ObjectConstructor
        | OptionalFieldAccess
        | QualifiedNameReference
        | QueryAction
        | QueryExpression
        | RawTemplateExpression
        | ReceiveAction
        | RegexTemplateExpression
        | RemoteMethodCallAction
        | SimpleNameReference
        | StartAction
        | StringLiteral
        | StringTemplateExpression
        | StringTypeDesc
        | SyncSendAction
        | TableConstructor
        | TrapAction
        | TrapExpression
        | TypeCastExpression
        | TypeTestExpression
        | TypeofExpression
        | UnaryExpression
        | WaitAction
        | XmlFilterExpression
        | XmlStepExpression
        | XmlTemplateExpression;
    semicolonToken: SemicolonToken;
    typedBindingPattern: TypedBindingPattern;
  }
  
  export interface LockKeyword extends STNode {
    isMissing: boolean;
    isToken: boolean;
    value: string;
  }
  
  export interface LockStatement extends STNode {
    blockStatement: BlockStatement;
    lockKeyword: LockKeyword;
    onFailClause?: OnFailClause;
  }
  
  export interface LogicalAndToken extends STNode {
    isMissing: boolean;
    isToken: boolean;
    value: string;
  }
  
  export interface LogicalOrToken extends STNode {
    isMissing: boolean;
    isToken: boolean;
    value: string;
  }
  
  export interface LtEqualToken extends STNode {
    isMissing: boolean;
    isToken: boolean;
    value: string;
  }
  
  export interface LtToken extends STNode {
    isMissing: boolean;
    isToken: boolean;
    value: string;
  }
  
  export interface MapKeyword extends STNode {
    isMissing: boolean;
    isToken: boolean;
    value: string;
  }
  
  export interface MapTypeDesc extends STNode {
    mapKeywordToken: MapKeyword;
    mapTypeParamsNode: TypeParameter;
  }
  
  export interface MappingBindingPattern extends STNode {
    closeBrace: CloseBraceToken;
    fieldBindingPatterns: (CommaToken | FieldBindingPattern | RestBindingPattern)[];
    openBrace: OpenBraceToken;
  }
  
  export interface MappingConstructor extends STNode {
    closeBrace: CloseBraceToken;
    fields: (CommaToken | ComputedNameField | SpecificField | SpreadField)[];
    openBrace: OpenBraceToken;
  }
  
  export interface MappingMatchPattern extends STNode {
    closeBraceToken: CloseBraceToken;
    fieldMatchPatterns: (CommaToken | FieldMatchPattern | RestMatchPattern)[];
    openBraceToken: OpenBraceToken;
  }
  
  export interface MarkdownCodeBlock extends STNode {
    codeLines: MarkdownCodeLine[];
    endBacktick: TripleBacktickToken;
    endLineHashToken: HashToken;
    langAttribute?: CodeContent;
    startBacktick: TripleBacktickToken;
    startLineHashToken: HashToken;
  }
  
  export interface MarkdownCodeLine extends STNode {
    codeDescription: CodeContent;
    hashToken: HashToken;
  }
  
  export interface MarkdownDeprecationDocumentationLine extends STNode {
    documentElements: (DeprecationLiteral | DocumentationDescription)[];
    hashToken: HashToken;
  }
  
  export interface MarkdownDocumentation extends STNode {
    documentationLines: (
        | MarkdownCodeBlock
        | MarkdownDeprecationDocumentationLine
        | MarkdownDocumentationLine
        | MarkdownParameterDocumentationLine
        | MarkdownReferenceDocumentationLine
        | MarkdownReturnParameterDocumentationLine
    )[];
  }
  
  export interface MarkdownDocumentationLine extends STNode {
    documentElements: DocumentationDescription[];
    hashToken: HashToken;
  }
  
  export interface MarkdownParameterDocumentationLine extends STNode {
    documentElements: (BallerinaNameReference | DocumentationDescription | InlineCodeReference)[];
    hashToken: HashToken;
    minusToken: MinusToken;
    parameterName: ParameterName;
    plusToken: PlusToken;
  }
  
  export interface MarkdownReferenceDocumentationLine extends STNode {
    documentElements: (BallerinaNameReference | DocumentationDescription | InlineCodeReference)[];
    hashToken: HashToken;
  }
  
  export interface MarkdownReturnParameterDocumentationLine extends STNode {
    documentElements: (DocumentationDescription | InlineCodeReference)[];
    hashToken: HashToken;
    minusToken: MinusToken;
    parameterName: ReturnKeyword;
    plusToken: PlusToken;
  }
  
  export interface MatchClause extends STNode {
    blockStatement: BlockStatement;
    matchGuard?: MatchGuard;
    matchPatterns: (
        | BooleanLiteral
        | ErrorMatchPattern
        | ListMatchPattern
        | MappingMatchPattern
        | NilLiteral
        | NullLiteral
        | NumericLiteral
        | PipeToken
        | SimpleNameReference
        | StringLiteral
        | TypedBindingPattern
    )[];
    rightDoubleArrow: RightDoubleArrowToken;
  }
  
  export interface MatchGuard extends STNode {
    expression: BinaryExpression | BooleanLiteral | BracedExpression | FunctionCall | MethodCall | SimpleNameReference | TypeTestExpression | UnaryExpression;
    ifKeyword: IfKeyword;
  }
  
  export interface MatchKeyword extends STNode {
    isMissing: boolean;
    isToken: boolean;
    value: string;
  }
  
  export interface MatchStatement extends STNode {
    closeBrace: CloseBraceToken;
    condition: BracedAction | BracedExpression | LetExpression | QueryAction | SimpleNameReference | TypeCastExpression | WaitAction;
    matchClauses: MatchClause[];
    matchKeyword: MatchKeyword;
    onFailClause?: OnFailClause;
    openBrace: OpenBraceToken;
  }
  
  export interface Metadata extends STNode {
    annotations: Annotation[];
    documentationString?: MarkdownDocumentation;
  }
  
  export interface MethodCall extends STNode {
    arguments: (CommaToken | NamedArg | PositionalArg | RestArg)[];
    closeParenToken: CloseParenToken;
    dotToken: DotToken;
    expression:
        | BracedExpression
        | FieldAccess
        | FunctionCall
        | IndexedExpression
        | IntTypeDesc
        | ListConstructor
        | MappingConstructor
        | MethodCall
        | OptionalFieldAccess
        | QualifiedNameReference
        | SimpleNameReference
        | StringLiteral
        | StringTypeDesc
        | XmlStepExpression;
    methodName: SimpleNameReference;
    openParenToken: OpenParenToken;
  }
  
  export interface MethodDeclaration extends STNode {
    functionKeyword: FunctionKeyword;
    metadata?: Metadata;
    methodName: IdentifierToken;
    methodSignature: FunctionSignature;
    qualifierList: (IsolatedKeyword | PublicKeyword | RemoteKeyword)[];
    relativeResourcePath: any;
    semicolon: SemicolonToken;
  }
  
  export interface MinusToken extends STNode {
    isMissing: boolean;
    isToken: boolean;
    value: string;
  }
  
  export interface ModulePart extends STNode {
    eofToken: EofToken;
    imports: ImportDeclaration[];
    members: (
        | AnnotationDeclaration
        | ClassDefinition
        | ConstDeclaration
        | EnumDeclaration
        | FunctionDefinition
        | ListenerDeclaration
        | ModuleVarDecl
        | ModuleXmlNamespaceDeclaration
        | ServiceDeclaration
        | TypeDefinition
    )[];
  }
  
  export interface ModuleVarDecl extends STNode {
    equalsToken?: EqualToken;
    initializer?:
        | BinaryExpression
        | BooleanLiteral
        | BracedExpression
        | CheckExpression
        | ConditionalExpression
        | ErrorConstructor
        | ExplicitAnonymousFunctionExpression
        | ExplicitNewExpression
        | FieldAccess
        | FunctionCall
        | ImplicitAnonymousFunctionExpression
        | ImplicitNewExpression
        | IndexedExpression
        | IntTypeDesc
        | JsonTypeDesc
        | LetExpression
        | ListConstructor
        | MappingConstructor
        | MethodCall
        | NilLiteral
        | NullLiteral
        | NumericLiteral
        | ObjectConstructor
        | QualifiedNameReference
        | QueryExpression
        | RequiredExpression
        | SimpleNameReference
        | StringLiteral
        | TableConstructor
        | TypeCastExpression
        | TypeofExpression
        | UnaryExpression
        | XmlFilterExpression
        | XmlTemplateExpression;
    metadata?: Metadata;
    qualifiers: (ConfigurableKeyword | FinalKeyword | IsolatedKeyword)[];
    semicolonToken: SemicolonToken;
    typedBindingPattern: TypedBindingPattern;
    visibilityQualifier?: PublicKeyword;
  }
  
  export interface ModuleXmlNamespaceDeclaration extends STNode {
    asKeyword?: AsKeyword;
    namespacePrefix?: IdentifierToken;
    namespaceuri: SimpleNameReference | StringLiteral;
    semicolonToken: SemicolonToken;
    xmlnsKeyword: XmlnsKeyword;
  }
  
  export interface NamedArg extends STNode {
    argumentName: SimpleNameReference;
    equalsToken: EqualToken;
    expression:
        | BinaryExpression
        | BooleanLiteral
        | BooleanTypeDesc
        | ErrorConstructor
        | ExplicitAnonymousFunctionExpression
        | ExplicitNewExpression
        | FieldAccess
        | FloatTypeDesc
        | FunctionCall
        | ImplicitNewExpression
        | IndexedExpression
        | IntTypeDesc
        | ListConstructor
        | MappingConstructor
        | MethodCall
        | NumericLiteral
        | QualifiedNameReference
        | SimpleNameReference
        | StringLiteral
        | StringTypeDesc
        | TypeCastExpression
        | TypeTestExpression;
  }
  
  export interface NamedArgBindingPattern extends STNode {
    argName: IdentifierToken;
    bindingPattern: CaptureBindingPattern | ErrorBindingPattern | ListBindingPattern | MappingBindingPattern | WildcardBindingPattern;
    equalsToken: EqualToken;
  }
  
  export interface NamedArgMatchPattern extends STNode {
    equalToken: EqualToken;
    identifier: IdentifierToken;
    matchPattern: ListMatchPattern | MappingMatchPattern | NumericLiteral | QualifiedNameReference | TypedBindingPattern;
  }
  
  export interface NamedWorkerDeclaration extends STNode {
    annotations: Annotation[];
    returnTypeDesc?: ReturnTypeDescriptor;
    workerBody: BlockStatement;
    workerKeyword: WorkerKeyword;
    workerName: IdentifierToken;
  }
  
  export interface NamedWorkerDeclarator extends STNode {
    namedWorkerDeclarations: NamedWorkerDeclaration[];
    workerInitStatements: (ActionStatement | AssignmentStatement | CallStatement | ForkStatement | IfElseStatement | LocalVarDecl | LockStatement)[];
  }
  
  export interface NegationToken extends STNode {
    isMissing: boolean;
    isToken: boolean;
    value: string;
  }
  
  export interface NeverKeyword extends STNode {
    isMissing: boolean;
    isToken: boolean;
    value: string;
  }
  
  export interface NeverTypeDesc extends STNode {
    name: NeverKeyword;
  }
  
  export interface NewKeyword extends STNode {
    isMissing: boolean;
    isToken: boolean;
    value: string;
  }
  
  export interface NilLiteral extends STNode {
    closeParenToken: CloseParenToken;
    openParenToken: OpenParenToken;
  }
  
  export interface NilTypeDesc extends STNode {
    closeParenToken: CloseParenToken;
    openParenToken: OpenParenToken;
  }
  
  export interface NotDoubleEqualToken extends STNode {
    isMissing: boolean;
    isToken: boolean;
    value: string;
  }
  
  export interface NotEqualToken extends STNode {
    isMissing: boolean;
    isToken: boolean;
    value: string;
  }
  
  export interface NotIsKeyword extends STNode {
    isMissing: boolean;
    isToken: boolean;
    value: string;
  }
  
  export interface NullKeyword extends STNode {
    isMissing: boolean;
    isToken: boolean;
    value: string;
  }
  
  export interface NullLiteral extends STNode {
    literalToken: NullKeyword;
  }
  
  export interface NumericLiteral extends STNode {
    literalToken: DecimalFloatingPointLiteralToken | DecimalIntegerLiteralToken | HexFloatingPointLiteralToken | HexIntegerLiteralToken;
  }
  
  export interface ObjectConstructor extends STNode {
    annotations: Annotation[];
    closeBraceToken: CloseBraceToken;
    members: (ObjectField | ObjectMethodDefinition | ResourceAccessorDefinition)[];
    objectKeyword: ObjectKeyword;
    objectTypeQualifiers: (ClientKeyword | IsolatedKeyword | ServiceKeyword)[];
    openBraceToken: OpenBraceToken;
    typeReference?: QualifiedNameReference | SimpleNameReference;
  }
  
  export interface ObjectField extends STNode {
    equalsToken?: EqualToken;
    expression?:
        | BinaryExpression
        | BooleanLiteral
        | BracedExpression
        | CheckExpression
        | ErrorConstructor
        | ExplicitAnonymousFunctionExpression
        | ExplicitNewExpression
        | FunctionCall
        | ImplicitAnonymousFunctionExpression
        | ImplicitNewExpression
        | LetExpression
        | ListConstructor
        | MappingConstructor
        | MethodCall
        | NilLiteral
        | NumericLiteral
        | ObjectConstructor
        | QualifiedNameReference
        | SimpleNameReference
        | StringLiteral
        | TableConstructor
        | TypeCastExpression
        | UnaryExpression
        | XmlTemplateExpression;
    fieldName: IdentifierToken;
    metadata?: Metadata;
    qualifierList: FinalKeyword[];
    semicolonToken: SemicolonToken;
    typeName:
        | AnyTypeDesc
        | AnydataTypeDesc
        | ArrayTypeDesc
        | BooleanTypeDesc
        | ByteTypeDesc
        | DecimalTypeDesc
        | DistinctTypeDesc
        | ErrorTypeDesc
        | FloatTypeDesc
        | FunctionTypeDesc
        | FutureTypeDesc
        | HandleTypeDesc
        | IntTypeDesc
        | IntersectionTypeDesc
        | JsonTypeDesc
        | MapTypeDesc
        | NeverTypeDesc
        | NilTypeDesc
        | ObjectTypeDesc
        | OptionalTypeDesc
        | ParenthesisedTypeDesc
        | QualifiedNameReference
        | ReadonlyTypeDesc
        | RecordTypeDesc
        | SimpleNameReference
        | SingletonTypeDesc
        | StreamTypeDesc
        | StringTypeDesc
        | TableTypeDesc
        | TupleTypeDesc
        | UnionTypeDesc
        | XmlTypeDesc;
    visibilityQualifier?: PrivateKeyword | PublicKeyword;
  }
  
  export interface ObjectKeyword extends STNode {
    isMissing: boolean;
    isToken: boolean;
    value: string;
  }
  
  export interface ObjectMethodDefinition extends STNode {
    functionBody: ExpressionFunctionBody | ExternalFunctionBody | FunctionBodyBlock;
    functionKeyword: FunctionKeyword;
    functionName: IdentifierToken;
    functionSignature: FunctionSignature;
    metadata?: Metadata;
    qualifierList: (IsolatedKeyword | PrivateKeyword | PublicKeyword | RemoteKeyword | TransactionalKeyword)[];
    relativeResourcePath: any;
  }
  
  export interface ObjectTypeDesc extends STNode {
    closeBrace: CloseBraceToken;
    members: (MethodDeclaration | ObjectField | ResourceAccessorDeclaration | TypeReference)[];
    objectKeyword: ObjectKeyword;
    objectTypeQualifiers: (ClientKeyword | IsolatedKeyword | ServiceKeyword)[];
    openBrace: OpenBraceToken;
  }
  
  export interface OnClause extends STNode {
    equalsKeyword: EqualsKeyword;
    lhsExpression:
        | BinaryExpression
        | BooleanLiteral
        | CheckExpression
        | FieldAccess
        | FunctionCall
        | MethodCall
        | NumericLiteral
        | SimpleNameReference
        | XmlTemplateExpression;
    onKeyword: OnKeyword;
    rhsExpression:
        | BooleanLiteral
        | CheckExpression
        | FieldAccess
        | FunctionCall
        | MethodCall
        | NumericLiteral
        | OptionalFieldAccess
        | SimpleNameReference
        | XmlTemplateExpression;
  }
  
  export interface OnConflictClause extends STNode {
    conflictKeyword: ConflictKeyword;
    expression: CheckExpression | ErrorConstructor | FunctionCall | NilLiteral | NullLiteral | NumericLiteral | SimpleNameReference;
    onKeyword: OnKeyword;
  }
  
  export interface OnFailClause extends STNode {
    blockStatement: BlockStatement;
    failErrorName?: IdentifierToken;
    failKeyword: FailKeyword;
    onKeyword: OnKeyword;
    typeDescriptor?: ErrorTypeDesc | SimpleNameReference | StringTypeDesc | UnionTypeDesc | VarTypeDesc;
  }
  
  export interface OnKeyword extends STNode {
    isMissing: boolean;
    isToken: boolean;
    value: string;
  }
  
  export interface OpenBracePipeToken extends STNode {
    isMissing: boolean;
    isToken: boolean;
    value: string;
  }
  
  export interface OpenBraceToken extends STNode {
    isMissing: boolean;
    isToken: boolean;
    value: string;
  }
  
  export interface OpenBracketToken extends STNode {
    isMissing: boolean;
    isToken: boolean;
    value: string;
  }
  
  export interface OpenParenToken extends STNode {
    isMissing: boolean;
    isToken: boolean;
    value: string;
  }
  
  export interface OptionalChainingToken extends STNode {
    isMissing: boolean;
    isToken: boolean;
    value: string;
  }
  
  export interface OptionalFieldAccess extends STNode {
    expression: AnnotAccess | BracedExpression | FieldAccess | FunctionCall | IndexedExpression | MethodCall | OptionalFieldAccess | SimpleNameReference;
    fieldName: QualifiedNameReference | SimpleNameReference;
    optionalChainingToken: OptionalChainingToken;
  }
  
  export interface OptionalTypeDesc extends STNode {
    questionMarkToken: QuestionMarkToken;
    typeDescriptor:
        | AnyTypeDesc
        | AnydataTypeDesc
        | ArrayTypeDesc
        | BooleanTypeDesc
        | ByteTypeDesc
        | DecimalTypeDesc
        | ErrorTypeDesc
        | FloatTypeDesc
        | FunctionTypeDesc
        | HandleTypeDesc
        | IntTypeDesc
        | JsonTypeDesc
        | MapTypeDesc
        | NeverTypeDesc
        | NilTypeDesc
        | ObjectTypeDesc
        | ParenthesisedTypeDesc
        | QualifiedNameReference
        | ReadonlyTypeDesc
        | RecordTypeDesc
        | SimpleNameReference
        | SingletonTypeDesc
        | StreamTypeDesc
        | StringTypeDesc
        | TableTypeDesc
        | TupleTypeDesc
        | TypedescTypeDesc
        | XmlTypeDesc;
  }
  
  export interface OrderByClause extends STNode {
    byKeyword: ByKeyword;
    orderKey: (CommaToken | OrderKey)[];
    orderKeyword: OrderKeyword;
  }
  
  export interface OrderKey extends STNode {
    expression: CheckExpression | FieldAccess | FunctionCall | IndexedExpression | MethodCall | OptionalFieldAccess | SimpleNameReference;
    orderDirection?: AscendingKeyword | DescendingKeyword;
  }
  
  export interface OrderKeyword extends STNode {
    isMissing: boolean;
    isToken: boolean;
    value: string;
  }
  
  export interface OuterKeyword extends STNode {
    isMissing: boolean;
    isToken: boolean;
    value: string;
  }
  
  export interface PanicKeyword extends STNode {
    isMissing: boolean;
    isToken: boolean;
    value: string;
  }
  
  export interface PanicStatement extends STNode {
    expression: BracedExpression | ErrorConstructor | FieldAccess | FunctionCall | SimpleNameReference | TypeCastExpression;
    panicKeyword: PanicKeyword;
    semicolonToken: SemicolonToken;
  }
  
  export interface ParameterDocReferenceToken extends STNode {
    isMissing: boolean;
    isToken: boolean;
    value: string;
  }
  
  export interface ParameterKeyword extends STNode {
    isMissing: boolean;
    isToken: boolean;
    value: string;
  }
  
  export interface ParameterName extends STNode {
    isMissing: boolean;
    isToken: boolean;
    value: string;
  }
  
  export interface ParenthesisedTypeDesc extends STNode {
    closeParenToken: CloseParenToken;
    openParenToken: OpenParenToken;
    typedesc:
        | AnyTypeDesc
        | AnydataTypeDesc
        | ArrayTypeDesc
        | BooleanTypeDesc
        | DecimalTypeDesc
        | ErrorTypeDesc
        | FloatTypeDesc
        | FunctionTypeDesc
        | IntTypeDesc
        | IntersectionTypeDesc
        | JsonTypeDesc
        | MapTypeDesc
        | ObjectTypeDesc
        | OptionalTypeDesc
        | ParenthesisedTypeDesc
        | QualifiedNameReference
        | RecordTypeDesc
        | SimpleNameReference
        | SingletonTypeDesc
        | StringTypeDesc
        | TableTypeDesc
        | TupleTypeDesc
        | UnionTypeDesc
        | XmlTypeDesc;
  }
  
  export interface ParenthesizedArgList extends STNode {
    arguments: (CommaToken | NamedArg | PositionalArg | RestArg)[];
    closeParenToken: CloseParenToken;
    openParenToken: OpenParenToken;
  }
  
  export interface PercentToken extends STNode {
    isMissing: boolean;
    isToken: boolean;
    value: string;
  }
  
  export interface PipeToken extends STNode {
    isMissing: boolean;
    isToken: boolean;
    value: string;
  }
  
  export interface PlusToken extends STNode {
    isMissing: boolean;
    isToken: boolean;
    value: string;
  }
  
  export interface PositionalArg extends STNode {
    expression:
        | AnnotAccess
        | AnyTypeDesc
        | AnydataTypeDesc
        | BinaryExpression
        | BooleanLiteral
        | BooleanTypeDesc
        | BracedExpression
        | ByteArrayLiteral
        | CheckExpression
        | ConditionalExpression
        | DecimalTypeDesc
        | ErrorConstructor
        | ExplicitAnonymousFunctionExpression
        | ExplicitNewExpression
        | FieldAccess
        | FloatTypeDesc
        | FunctionCall
        | ImplicitAnonymousFunctionExpression
        | ImplicitNewExpression
        | IndexedExpression
        | IntTypeDesc
        | JsonTypeDesc
        | LetExpression
        | ListConstructor
        | MappingConstructor
        | MethodCall
        | NilLiteral
        | NullLiteral
        | NumericLiteral
        | ObjectConstructor
        | OptionalFieldAccess
        | QualifiedNameReference
        | QueryExpression
        | RegexTemplateExpression
        | SimpleNameReference
        | StringLiteral
        | StringTemplateExpression
        | StringTypeDesc
        | TableConstructor
        | TrapExpression
        | TypeCastExpression
        | TypeTestExpression
        | TypeofExpression
        | UnaryExpression
        | XmlTemplateExpression;
  }
  
  export interface PrivateKeyword extends STNode {
    isMissing: boolean;
    isToken: boolean;
    value: string;
  }
  
  export interface PublicKeyword extends STNode {
    isMissing: boolean;
    isToken: boolean;
    value: string;
  }
  
  export interface QualifiedNameReference extends STNode {
    colon: ColonToken;
    identifier: IdentifierToken;
    modulePrefix: IdentifierToken;
  }
  
  export interface QueryAction extends STNode {
    blockStatement: BlockStatement;
    doKeyword: DoKeyword;
    queryPipeline: QueryPipeline;
  }
  
  export interface QueryConstructType extends STNode {
    keySpecifier?: KeySpecifier;
    keyword: MapKeyword | StreamKeyword | TableKeyword;
  }
  
  export interface QueryExpression extends STNode {
    onConflictClause?: OnConflictClause;
    queryConstructType?: QueryConstructType;
    queryPipeline: QueryPipeline;
    selectClause: SelectClause;
    resultClause?: SelectClause; // [Hack] This is to support the new syntax
  }
  
  export interface QueryPipeline extends STNode {
    fromClause: FromClause;
    intermediateClauses: (FromClause | JoinClause | LetClause | LimitClause | OrderByClause | WhereClause)[];
  }
  
  export interface QuestionMarkToken extends STNode {
    isMissing: boolean;
    isToken: boolean;
    value: string;
  }
  
  export interface RawTemplateExpression extends STNode {
    content: (Interpolation | TemplateString)[];
    endBacktick: BacktickToken;
    startBacktick: BacktickToken;
  }
  
  export interface ReAssertion extends STNode {
    reAssertion: ReAssertionValue;
  }
  
  export interface ReAssertionValue extends STNode {
    isMissing: boolean;
    isToken: boolean;
    value: string;
  }
  
  export interface ReAtomQuantifier extends STNode {
    reAtom: Interpolation | ReCapturingGroup | ReCharEscape | ReCharacterClass | ReQuoteEscape | ReSimpleCharClassEscape | ReUnicodePropertyEscape;
    reQuantifier?: ReQuantifier;
  }
  
  export interface ReBaseQuantifierValue extends STNode {
    isMissing: boolean;
    isToken: boolean;
    value: string;
  }
  
  export interface ReBracedQuantifier extends STNode {
    closeBraceToken: CloseBraceToken;
    commaToken?: CommaToken;
    leastTimesMatchedDigit: ReBracedQuantifierDigit[];
    mostTimesMatchedDigit?: ReBracedQuantifierDigit[];
    openBraceToken: OpenBraceToken;
  }
  
  export interface ReBracedQuantifierDigit extends STNode {
    isMissing: boolean;
    isToken: boolean;
    value: string;
  }
  
  export interface ReCapturingGroup extends STNode {
    closeParenthesis: CloseParenToken;
    openParenthesis: OpenParenToken;
    reFlagExpression?: ReFlagExpr;
    reSequences: (PipeToken | ReSequence)[];
  }
  
  export interface ReChar extends STNode {
    isMissing: boolean;
    isToken: boolean;
    value: string;
  }
  
  export interface ReCharEscape extends STNode {
    reAtomCharOrEscape: ReChar | ReEscape;
  }
  
  export interface ReCharSetAtom extends STNode {
    isMissing: boolean;
    isToken: boolean;
    value: string;
  }
  
  export interface ReCharSetAtomNoDash extends STNode {
    isMissing: boolean;
    isToken: boolean;
    value: string;
  }
  
  export interface ReCharSetAtomNoDashWithReCharSetNoDash extends STNode {
    reCharSetAtomNoDash: ReCharSetAtomNoDash | ReQuoteEscape | ReSimpleCharClassEscape | ReUnicodePropertyEscape;
    reCharSetNoDash:
        | ReCharSetAtom
        | ReCharSetAtomNoDash
        | ReCharSetAtomNoDashWithReCharSetNoDash
        | ReCharSetRangeNoDashWithReCharSet
        | ReQuoteEscape
        | ReUnicodePropertyEscape;
  }
  
  export interface ReCharSetAtomWithReCharSetNoDash extends STNode {
    reCharSetAtom: ReCharSetAtom | ReQuoteEscape | ReSimpleCharClassEscape | ReUnicodePropertyEscape;
    reCharSetNoDash:
        | ReCharSetAtom
        | ReCharSetAtomNoDash
        | ReCharSetAtomNoDashWithReCharSetNoDash
        | ReCharSetRangeNoDashWithReCharSet
        | ReQuoteEscape
        | ReSimpleCharClassEscape
        | ReUnicodePropertyEscape;
  }
  
  export interface ReCharSetRange extends STNode {
    lhsReCharSetAtom: ReCharSetRangeLhsCharSetAtom | ReSimpleCharClassEscape | ReUnicodePropertyEscape;
    minusToken: MinusToken;
    rhsReCharSetAtom: ReCharSetAtom | ReSimpleCharClassEscape;
  }
  
  export interface ReCharSetRangeLhsCharSetAtom extends STNode {
    isMissing: boolean;
    isToken: boolean;
    value: string;
  }
  
  export interface ReCharSetRangeNoDash extends STNode {
    minusToken: MinusToken;
    reCharSetAtom: ReCharSetAtom | ReSimpleCharClassEscape;
    reCharSetAtomNoDash: ReCharSetRangeNoDashLhsCharSetAtomNoDash | ReSimpleCharClassEscape | ReUnicodePropertyEscape;
  }
  
  export interface ReCharSetRangeNoDashLhsCharSetAtomNoDash extends STNode {
    isMissing: boolean;
    isToken: boolean;
    value: string;
  }
  
  export interface ReCharSetRangeNoDashWithReCharSet extends STNode {
    reCharSet?: ReCharSetAtomWithReCharSetNoDash;
    reCharSetRangeNoDash: ReCharSetRangeNoDash;
  }
  
  export interface ReCharSetRangeWithReCharSet extends STNode {
    reCharSet?: ReCharSetAtomWithReCharSetNoDash | ReCharSetRangeWithReCharSet;
    reCharSetRange: ReCharSetRange;
  }
  
  export interface ReCharacterClass extends STNode {
    closeBracket: CloseBracketToken;
    negation?: BitwiseXorToken;
    openBracket: OpenBracketToken;
    reCharSet?: ReCharSetAtom | ReCharSetAtomWithReCharSetNoDash | ReCharSetRangeWithReCharSet | ReSimpleCharClassEscape;
  }
  
  export interface ReEscape extends STNode {
    isMissing: boolean;
    isToken: boolean;
    value: string;
  }
  
  export interface ReFlagExpr extends STNode {
    colon: ColonToken;
    questionMark: QuestionMarkToken;
    reFlagsOnOff?: ReFlagsOnOff;
  }
  
  export interface ReFlags extends STNode {
    reFlag: ReFlagsValue[];
  }
  
  export interface ReFlagsOnOff extends STNode {
    lhsReFlags: ReFlags;
    minusToken?: MinusToken;
    rhsReFlags?: ReFlags;
  }
  
  export interface ReFlagsValue extends STNode {
    isMissing: boolean;
    isToken: boolean;
    value: string;
  }
  
  export interface ReKeyword extends STNode {
    isMissing: boolean;
    isToken: boolean;
    value: string;
  }
  
  export interface ReProperty extends STNode {
    isMissing: boolean;
    isToken: boolean;
    value: string;
  }
  
  export interface ReQuantifier extends STNode {
    nonGreedyChar?: QuestionMarkToken;
    reBaseQuantifier: ReBaseQuantifierValue | ReBracedQuantifier;
  }
  
  export interface ReQuoteEscape extends STNode {
    reSyntaxChar: ReSyntaxChar;
    slashToken: BackSlashToken;
  }
  
  export interface ReSequence extends STNode {
    reTerm: (ReAssertion | ReAtomQuantifier)[];
  }
  
  export interface ReSimpleCharClassCode extends STNode {
    isMissing: boolean;
    isToken: boolean;
    value: string;
  }
  
  export interface ReSimpleCharClassEscape extends STNode {
    reSimpleCharClassCode: ReSimpleCharClassCode;
    slashToken: BackSlashToken;
  }
  
  export interface ReSyntaxChar extends STNode {
    isMissing: boolean;
    isToken: boolean;
    value: string;
  }
  
  export interface ReUnicodeGeneralCategory extends STNode {
    categoryStart?: ReUnicodeGeneralCategoryStart;
    reUnicodeGeneralCategoryName: ReUnicodeGeneralCategoryName;
  }
  
  export interface ReUnicodeGeneralCategoryName extends STNode {
    isMissing: boolean;
    isToken: boolean;
    value: string;
  }
  
  export interface ReUnicodeGeneralCategoryStart extends STNode {
    isMissing: boolean;
    isToken: boolean;
    value: string;
  }
  
  export interface ReUnicodePropertyEscape extends STNode {
    closeBraceToken: CloseBraceToken;
    openBraceToken: OpenBraceToken;
    property: ReProperty;
    reUnicodeProperty: ReUnicodeGeneralCategory | ReUnicodeScript;
    slashToken: BackSlashToken;
  }
  
  export interface ReUnicodePropertyValue extends STNode {
    isMissing: boolean;
    isToken: boolean;
    value: string;
  }
  
  export interface ReUnicodeScript extends STNode {
    reUnicodePropertyValue: ReUnicodePropertyValue;
    scriptStart: ReUnicodeScriptStart;
  }
  
  export interface ReUnicodeScriptStart extends STNode {
    isMissing: boolean;
    isToken: boolean;
    value: string;
  }
  
  export interface ReadonlyKeyword extends STNode {
    isMissing: boolean;
    isToken: boolean;
    value: string;
  }
  
  export interface ReadonlyTypeDesc extends STNode {
    name: ReadonlyKeyword;
  }
  
  export interface ReceiveAction extends STNode {
    leftArrow: LeftArrowToken;
    receiveWorkers: ReceiveFields | SimpleNameReference;
  }
  
  export interface ReceiveFields extends STNode {
    closeBrace: CloseBraceToken;
    openBrace: OpenBraceToken;
    receiveFields: (CommaToken | IdentifierToken)[];
  }
  
  export interface RecordField extends STNode {
    fieldName: IdentifierToken;
    metadata?: Metadata;
    questionMarkToken?: QuestionMarkToken;
    readonlyKeyword?: ReadonlyKeyword;
    semicolonToken: SemicolonToken;
    typeName:
        | AnyTypeDesc
        | AnydataTypeDesc
        | ArrayTypeDesc
        | BooleanTypeDesc
        | ByteTypeDesc
        | DecimalTypeDesc
        | DistinctTypeDesc
        | ErrorTypeDesc
        | FloatTypeDesc
        | FunctionTypeDesc
        | FutureTypeDesc
        | HandleTypeDesc
        | IntTypeDesc
        | IntersectionTypeDesc
        | JsonTypeDesc
        | MapTypeDesc
        | NeverTypeDesc
        | NilTypeDesc
        | ObjectTypeDesc
        | OptionalTypeDesc
        | ParenthesisedTypeDesc
        | QualifiedNameReference
        | ReadonlyTypeDesc
        | RecordTypeDesc
        | SimpleNameReference
        | SingletonTypeDesc
        | StreamTypeDesc
        | StringTypeDesc
        | TableTypeDesc
        | TupleTypeDesc
        | TypedescTypeDesc
        | UnionTypeDesc
        | XmlTypeDesc;
  }
  
  export interface RecordFieldWithDefaultValue extends STNode {
    equalsToken: EqualToken;
    expression:
        | BinaryExpression
        | BooleanLiteral
        | ByteTypeDesc
        | CheckExpression
        | ExplicitAnonymousFunctionExpression
        | ExplicitNewExpression
        | FieldAccess
        | FunctionCall
        | ImplicitAnonymousFunctionExpression
        | ImplicitNewExpression
        | IntTypeDesc
        | LetExpression
        | ListConstructor
        | MappingConstructor
        | MethodCall
        | NilLiteral
        | NullLiteral
        | NumericLiteral
        | ObjectConstructor
        | SimpleNameReference
        | StringLiteral
        | StringTypeDesc
        | TableConstructor
        | TypeCastExpression
        | UnaryExpression;
    fieldName: IdentifierToken;
    metadata?: Metadata;
    readonlyKeyword?: ReadonlyKeyword;
    semicolonToken: SemicolonToken;
    typeName:
        | AnyTypeDesc
        | AnydataTypeDesc
        | ArrayTypeDesc
        | BooleanTypeDesc
        | ByteTypeDesc
        | DecimalTypeDesc
        | FloatTypeDesc
        | FunctionTypeDesc
        | IntTypeDesc
        | IntersectionTypeDesc
        | JsonTypeDesc
        | MapTypeDesc
        | NilTypeDesc
        | ObjectTypeDesc
        | OptionalTypeDesc
        | QualifiedNameReference
        | ReadonlyTypeDesc
        | RecordTypeDesc
        | SimpleNameReference
        | SingletonTypeDesc
        | StreamTypeDesc
        | StringTypeDesc
        | TableTypeDesc
        | TupleTypeDesc
        | TypedescTypeDesc
        | UnionTypeDesc;
  }
  
  export interface RecordKeyword extends STNode {
    isMissing: boolean;
    isToken: boolean;
    value: string;
  }
  
  export interface RecordRestType extends STNode {
    ellipsisToken: EllipsisToken;
    semicolonToken: SemicolonToken;
    typeName:
        | AnyTypeDesc
        | AnydataTypeDesc
        | ArrayTypeDesc
        | BooleanTypeDesc
        | ByteTypeDesc
        | DecimalTypeDesc
        | ErrorTypeDesc
        | FloatTypeDesc
        | FunctionTypeDesc
        | FutureTypeDesc
        | IntTypeDesc
        | IntersectionTypeDesc
        | JsonTypeDesc
        | MapTypeDesc
        | NeverTypeDesc
        | NilTypeDesc
        | ObjectTypeDesc
        | OptionalTypeDesc
        | ParenthesisedTypeDesc
        | QualifiedNameReference
        | RecordTypeDesc
        | SimpleNameReference
        | StreamTypeDesc
        | StringTypeDesc
        | TupleTypeDesc
        | UnionTypeDesc
        | XmlTypeDesc;
  }
  
  export interface RecordTypeDesc extends STNode {
    bodyEndDelimiter: CloseBracePipeToken | CloseBraceToken;
    bodyStartDelimiter: OpenBracePipeToken | OpenBraceToken;
    fields: (RecordField | RecordFieldWithDefaultValue | TypeReference)[];
    recordKeyword: RecordKeyword;
    recordRestDescriptor?: RecordRestType;
  }
  
  export interface RegexTemplateExpression extends STNode {
    content: (PipeToken | ReSequence)[];
    endBacktick: BacktickToken;
    startBacktick: BacktickToken;
    type: ReKeyword;
  }
  
  export interface RemoteKeyword extends STNode {
    isMissing: boolean;
    isToken: boolean;
    value: string;
  }
  
  export interface RemoteMethodCallAction extends STNode {
    arguments: (CommaToken | NamedArg | PositionalArg | RestArg)[];
    closeParenToken: CloseParenToken;
    expression: FieldAccess | FunctionCall | SimpleNameReference;
    methodName: SimpleNameReference;
    openParenToken: OpenParenToken;
    rightArrowToken: RightArrowToken;
  }
  
  export interface RequiredExpression extends STNode {
    questionMarkToken: QuestionMarkToken;
  }
  
  export interface RequiredParam extends STNode {
    annotations: Annotation[];
    paramName?: IdentifierToken;
    typeName:
        | AnyTypeDesc
        | AnydataTypeDesc
        | ArrayTypeDesc
        | BooleanTypeDesc
        | ByteTypeDesc
        | DecimalTypeDesc
        | ErrorTypeDesc
        | FloatTypeDesc
        | FunctionTypeDesc
        | FutureTypeDesc
        | HandleTypeDesc
        | IntTypeDesc
        | IntersectionTypeDesc
        | JsonTypeDesc
        | MapTypeDesc
        | NeverTypeDesc
        | NilTypeDesc
        | ObjectTypeDesc
        | OptionalTypeDesc
        | ParenthesisedTypeDesc
        | QualifiedNameReference
        | ReadonlyTypeDesc
        | RecordTypeDesc
        | SimpleNameReference
        | SingletonTypeDesc
        | StreamTypeDesc
        | StringTypeDesc
        | TableTypeDesc
        | TupleTypeDesc
        | TypedescTypeDesc
        | UnionTypeDesc
        | XmlTypeDesc;
  }
  
  export interface ResourceAccessRestSegment extends STNode {
    closeBracketToken: CloseBracketToken;
    ellipsisToken: EllipsisToken;
    expression: BooleanLiteral | ListConstructor | SimpleNameReference;
    openBracketToken: OpenBracketToken;
  }
  
  export interface ResourceAccessorDeclaration extends STNode {
    functionKeyword: FunctionKeyword;
    metadata?: Metadata;
    methodName: IdentifierToken;
    methodSignature: FunctionSignature;
    qualifierList: ResourceKeyword[];
    relativeResourcePath: (DotToken | IdentifierToken | ResourcePathRestParam | ResourcePathSegmentParam | SlashToken)[];
    semicolon: SemicolonToken;
  }
  
  export interface ResourceAccessorDefinition extends STNode {
    functionBody: ExpressionFunctionBody | ExternalFunctionBody | FunctionBodyBlock;
    functionKeyword: FunctionKeyword;
    functionName: IdentifierToken;
    functionSignature: FunctionSignature;
    metadata?: Metadata;
    qualifierList: (IsolatedKeyword | ResourceKeyword | TransactionalKeyword)[];
    relativeResourcePath: (DotToken | IdentifierToken | ResourcePathRestParam | ResourcePathSegmentParam | SlashToken)[];
  }
  
  export interface ResourceKeyword extends STNode {
    isMissing: boolean;
    isToken: boolean;
    value: string;
  }
  
  export interface ResourcePathRestParam extends STNode {
    annotations: any;
    closeBracketToken: CloseBracketToken;
    ellipsisToken: EllipsisToken;
    openBracketToken: OpenBracketToken;
    paramName?: IdentifierToken;
    typeDescriptor: AnydataTypeDesc | BooleanTypeDesc | ByteTypeDesc | IntTypeDesc | SimpleNameReference | SingletonTypeDesc | StringTypeDesc | XmlTypeDesc;
  }
  
  export interface ResourcePathSegmentParam extends STNode {
    annotations: any;
    closeBracketToken: CloseBracketToken;
    openBracketToken: OpenBracketToken;
    paramName?: IdentifierToken;
    typeDescriptor:
        | AnydataTypeDesc
        | BooleanTypeDesc
        | ByteTypeDesc
        | DecimalTypeDesc
        | ErrorTypeDesc
        | FloatTypeDesc
        | IntTypeDesc
        | JsonTypeDesc
        | MapTypeDesc
        | OptionalTypeDesc
        | QualifiedNameReference
        | RecordTypeDesc
        | SimpleNameReference
        | SingletonTypeDesc
        | StringTypeDesc
        | UnionTypeDesc
        | XmlTypeDesc;
  }
  
  export interface RestArg extends STNode {
    ellipsis: EllipsisToken;
    expression: FieldAccess | FunctionCall | ListConstructor | MethodCall | NilLiteral | SimpleNameReference;
  }
  
  export interface RestBindingPattern extends STNode {
    ellipsisToken: EllipsisToken;
    variableName: SimpleNameReference;
  }
  
  export interface RestMatchPattern extends STNode {
    ellipsisToken: EllipsisToken;
    varKeywordToken: VarKeyword;
    variableName: SimpleNameReference;
  }
  
  export interface RestParam extends STNode {
    annotations: Annotation[];
    ellipsisToken: EllipsisToken;
    paramName?: IdentifierToken;
    typeName:
        | AnyTypeDesc
        | AnydataTypeDesc
        | ArrayTypeDesc
        | BooleanTypeDesc
        | FloatTypeDesc
        | FunctionTypeDesc
        | HandleTypeDesc
        | IntTypeDesc
        | MapTypeDesc
        | ParenthesisedTypeDesc
        | QualifiedNameReference
        | RecordTypeDesc
        | SimpleNameReference
        | StringTypeDesc
        | TupleTypeDesc
        | TypedescTypeDesc
        | UnionTypeDesc;
  }
  
  export interface RestType extends STNode {
    ellipsisToken: EllipsisToken;
    typeDescriptor:
        | AnyTypeDesc
        | AnydataTypeDesc
        | ArrayTypeDesc
        | BooleanTypeDesc
        | ByteTypeDesc
        | DecimalTypeDesc
        | ErrorTypeDesc
        | FloatTypeDesc
        | IntTypeDesc
        | IntersectionTypeDesc
        | JsonTypeDesc
        | MapTypeDesc
        | NeverTypeDesc
        | NilTypeDesc
        | OptionalTypeDesc
        | ParenthesisedTypeDesc
        | RecordTypeDesc
        | SimpleNameReference
        | StringTypeDesc
        | TableTypeDesc
        | TupleTypeDesc
        | TypedescTypeDesc
        | UnionTypeDesc;
  }
  
  export interface RetryKeyword extends STNode {
    isMissing: boolean;
    isToken: boolean;
    value: string;
  }
  
  export interface RetryStatement extends STNode {
    arguments?: ParenthesizedArgList;
    onFailClause?: OnFailClause;
    retryBody: BlockStatement | TransactionStatement;
    retryKeyword: RetryKeyword;
    typeParameter?: TypeParameter;
  }
  
  export interface ReturnKeyword extends STNode {
    isMissing: boolean;
    isToken: boolean;
    value: string;
  }
  
  export interface ReturnStatement extends STNode {
    expression?:
        | AnnotAccess
        | BinaryExpression
        | BooleanLiteral
        | BracedAction
        | BracedExpression
        | CheckAction
        | CheckExpression
        | ConditionalExpression
        | ErrorConstructor
        | ExplicitAnonymousFunctionExpression
        | ExplicitNewExpression
        | FieldAccess
        | FunctionCall
        | ImplicitAnonymousFunctionExpression
        | ImplicitNewExpression
        | IndexedExpression
        | LetExpression
        | ListConstructor
        | MappingConstructor
        | MethodCall
        | NilLiteral
        | NullLiteral
        | NumericLiteral
        | ObjectConstructor
        | OptionalFieldAccess
        | QualifiedNameReference
        | QueryAction
        | QueryExpression
        | RawTemplateExpression
        | RegexTemplateExpression
        | RemoteMethodCallAction
        | SimpleNameReference
        | StartAction
        | StringLiteral
        | StringTemplateExpression
        | TrapAction
        | TrapExpression
        | TypeCastExpression
        | TypeTestExpression
        | TypeofExpression
        | UnaryExpression
        | WaitAction
        | XmlStepExpression
        | XmlTemplateExpression;
    returnKeyword: ReturnKeyword;
    semicolonToken: SemicolonToken;
  }
  
  export interface ReturnTypeDescriptor extends STNode {
    annotations: Annotation[];
    returnsKeyword: ReturnsKeyword;
    type:
        | AnyTypeDesc
        | AnydataTypeDesc
        | ArrayTypeDesc
        | BooleanTypeDesc
        | ByteTypeDesc
        | DecimalTypeDesc
        | ErrorTypeDesc
        | FloatTypeDesc
        | FunctionTypeDesc
        | FutureTypeDesc
        | HandleTypeDesc
        | IntTypeDesc
        | IntersectionTypeDesc
        | JsonTypeDesc
        | MapTypeDesc
        | NeverTypeDesc
        | NilTypeDesc
        | ObjectTypeDesc
        | OptionalTypeDesc
        | ParenthesisedTypeDesc
        | QualifiedNameReference
        | ReadonlyTypeDesc
        | RecordTypeDesc
        | SimpleNameReference
        | SingletonTypeDesc
        | StreamTypeDesc
        | StringTypeDesc
        | TableTypeDesc
        | TupleTypeDesc
        | TypedescTypeDesc
        | UnionTypeDesc
        | XmlTypeDesc;
  }
  
  export interface ReturnsKeyword extends STNode {
    isMissing: boolean;
    isToken: boolean;
    value: string;
  }
  
  export interface RightArrowToken extends STNode {
    isMissing: boolean;
    isToken: boolean;
    value: string;
  }
  
  export interface RightDoubleArrowToken extends STNode {
    isMissing: boolean;
    isToken: boolean;
    value: string;
  }
  
  export interface RollbackKeyword extends STNode {
    isMissing: boolean;
    isToken: boolean;
    value: string;
  }
  
  export interface RollbackStatement extends STNode {
    expression: FunctionCall;
    rollbackKeyword: RollbackKeyword;
    semicolon: SemicolonToken;
  }
  
  export interface SelectClause extends STNode {
    expression:
        | AsyncSendAction
        | BinaryExpression
        | BracedAction
        | BracedExpression
        | CheckAction
        | CheckExpression
        | ClientResourceAccessAction
        | ExplicitAnonymousFunctionExpression
        | FieldAccess
        | FunctionCall
        | ImplicitNewExpression
        | ListConstructor
        | MappingConstructor
        | MethodCall
        | NumericLiteral
        | OptionalFieldAccess
        | QueryAction
        | QueryExpression
        | RawTemplateExpression
        | ReceiveAction
        | RemoteMethodCallAction
        | SimpleNameReference
        | StartAction
        | SyncSendAction
        | TrapAction
        | TrapExpression
        | TypeCastExpression
        | WaitAction
        | XmlTemplateExpression;
    selectKeyword: SelectKeyword;
  }
  
  export interface SelectKeyword extends STNode {
    isMissing: boolean;
    isToken: boolean;
    value: string;
  }
  
  export interface SemicolonToken extends STNode {
    isMissing: boolean;
    isToken: boolean;
    value: string;
  }
  
  export interface ServiceDeclaration extends STNode {
    VisibleEndpoints?: any[];
    absoluteResourcePath: (IdentifierToken | SlashToken | StringLiteral)[];
    closeBraceToken: CloseBraceToken;
    expressions: (
        | BinaryExpression
        | CommaToken
        | ExplicitNewExpression
        | ImplicitNewExpression
        | MappingConstructor
        | NumericLiteral
        | QualifiedNameReference
        | SimpleNameReference
    )[];
    members: (ObjectField | ObjectMethodDefinition | ResourceAccessorDefinition)[];
    metadata?: Metadata;
    onKeyword: OnKeyword;
    openBraceToken: OpenBraceToken;
    qualifiers: IsolatedKeyword[];
    serviceKeyword: ServiceKeyword;
    typeDescriptor?: MapTypeDesc | SimpleNameReference;
    isRunnable?: boolean;
    runArgs?: any[];
  }
  
  export interface ServiceDocReferenceToken extends STNode {
    isMissing: boolean;
    isToken: boolean;
    value: string;
  }
  
  export interface ServiceKeyword extends STNode {
    isMissing: boolean;
    isToken: boolean;
    value: string;
  }
  
  export interface SimpleNameReference extends STNode {
    name: FunctionKeyword | IdentifierToken;
  }
  
  export interface SingleQuoteToken extends STNode {
    isMissing: boolean;
    isToken: boolean;
    value: string;
  }
  
  export interface SingletonTypeDesc extends STNode {
    simpleContExprNode: BooleanLiteral | NullLiteral | NumericLiteral | StringLiteral | UnaryExpression;
  }
  
  export interface SlashAsteriskToken extends STNode {
    isMissing: boolean;
    isToken: boolean;
    value: string;
  }
  
  export interface SlashLtToken extends STNode {
    isMissing: boolean;
    isToken: boolean;
    value: string;
  }
  
  export interface SlashToken extends STNode {
    isMissing: boolean;
    isToken: boolean;
    value: string;
  }
  
  export interface SourceKeyword extends STNode {
    isMissing: boolean;
    isToken: boolean;
    value: string;
  }
  
  export interface SpecificField extends STNode {
    colon?: ColonToken;
    fieldName: IdentifierToken | StringLiteral;
    readonlyKeyword?: ReadonlyKeyword;
    valueExpr?:
        | BinaryExpression
        | BooleanLiteral
        | BracedExpression
        | ByteTypeDesc
        | CheckExpression
        | ConditionalExpression
        | ErrorConstructor
        | ExplicitAnonymousFunctionExpression
        | ExplicitNewExpression
        | FieldAccess
        | FunctionCall
        | ImplicitAnonymousFunctionExpression
        | ImplicitNewExpression
        | IndexedExpression
        | IntTypeDesc
        | LetExpression
        | ListConstructor
        | MappingConstructor
        | MethodCall
        | NilLiteral
        | NullLiteral
        | NumericLiteral
        | ObjectConstructor
        | OptionalFieldAccess
        | QualifiedNameReference
        | QueryExpression
        | RegexTemplateExpression
        | SimpleNameReference
        | StringLiteral
        | StringTemplateExpression
        | StringTypeDesc
        | TableConstructor
        | TypeCastExpression
        | TypeTestExpression
        | TypeofExpression
        | UnaryExpression
        | XmlTemplateExpression;
  }
  
  export interface SpreadField extends STNode {
    ellipsis: EllipsisToken;
    valueExpr: BooleanLiteral | BracedExpression | FunctionCall | MappingConstructor | SimpleNameReference;
  }
  
  export interface SpreadMember extends STNode {
    ellipsis: EllipsisToken;
    expression: ListConstructor | SimpleNameReference;
  }
  
  export interface StartAction extends STNode {
    annotations: Annotation[];
    expression: FunctionCall | MethodCall | RemoteMethodCallAction;
    startKeyword: StartKeyword;
  }
  
  export interface StartKeyword extends STNode {
    isMissing: boolean;
    isToken: boolean;
    value: string;
  }
  
  export interface StreamKeyword extends STNode {
    isMissing: boolean;
    isToken: boolean;
    value: string;
  }
  
  export interface StreamTypeDesc extends STNode {
    streamKeywordToken: StreamKeyword;
    streamTypeParamsNode?: StreamTypeParams;
  }
  
  export interface StreamTypeParams extends STNode {
    commaToken?: CommaToken;
    gtToken: GtToken;
    leftTypeDescNode:
        | AnydataTypeDesc
        | ArrayTypeDesc
        | BooleanTypeDesc
        | ByteTypeDesc
        | FloatTypeDesc
        | IntTypeDesc
        | IntersectionTypeDesc
        | OptionalTypeDesc
        | QualifiedNameReference
        | RecordTypeDesc
        | SimpleNameReference
        | StreamTypeDesc
        | StringTypeDesc
        | UnionTypeDesc;
    ltToken: LtToken;
    rightTypeDescNode?:
        | ErrorTypeDesc
        | IntTypeDesc
        | NeverTypeDesc
        | NilTypeDesc
        | OptionalTypeDesc
        | QualifiedNameReference
        | ReadonlyTypeDesc
        | SimpleNameReference;
  }
  
  export interface StringKeyword extends STNode {
    isMissing: boolean;
    isToken: boolean;
    value: string;
  }
  
  export interface StringLiteral extends STNode {
    literalToken: StringLiteralToken;
  }
  
  export interface StringLiteralToken extends STNode {
    isMissing: boolean;
    isToken: boolean;
    value: string;
  }
  
  export interface StringTemplateExpression extends STNode {
    content: (Interpolation | TemplateString)[];
    endBacktick: BacktickToken;
    startBacktick: BacktickToken;
    type: StringKeyword;
  }
  
  export interface StringTypeDesc extends STNode {
    name: StringKeyword;
  }
  
  export interface SyncSendAction extends STNode {
    expression: BinaryExpression | NumericLiteral | SimpleNameReference | StringLiteral;
    peerWorker: SimpleNameReference;
    syncSendToken: SyncSendToken;
  }
  
  export interface SyncSendToken extends STNode {
    isMissing: boolean;
    isToken: boolean;
    value: string;
  }
  
  export interface TableConstructor extends STNode {
    closeBracket: CloseBracketToken;
    keySpecifier?: KeySpecifier;
    openBracket: OpenBracketToken;
    rows: (CommaToken | MappingConstructor)[];
    tableKeyword: TableKeyword;
  }
  
  export interface TableKeyword extends STNode {
    isMissing: boolean;
    isToken: boolean;
    value: string;
  }
  
  export interface TableTypeDesc extends STNode {
    keyConstraintNode?: KeySpecifier | KeyTypeConstraint;
    rowTypeParameterNode: TypeParameter;
    tableKeywordToken: TableKeyword;
  }
  
  export interface TemplateString extends STNode {
    isMissing: boolean;
    isToken: boolean;
    value: string;
  }
  
  export interface TransactionKeyword extends STNode {
    isMissing: boolean;
    isToken: boolean;
    value: string;
  }
  
  export interface TransactionStatement extends STNode {
    blockStatement: BlockStatement;
    onFailClause?: OnFailClause;
    transactionKeyword: TransactionKeyword;
  }
  
  export interface TransactionalExpression extends STNode {
    syntaxDiagnostics: any;
    transactionalKeyword: TransactionalKeyword;
  }
  export interface TransactionalKeyword extends STNode {
    isMissing: boolean;
    isToken: boolean;
    value: string;
  }
  
  export interface TrapAction extends STNode {
    expression: BracedAction | CheckAction | QueryAction | ReceiveAction | RemoteMethodCallAction | StartAction | WaitAction;
    trapKeyword: TrapKeyword;
  }
  
  export interface TrapExpression extends STNode {
    expression:
        | BinaryExpression
        | BracedExpression
        | ConditionalExpression
        | ExplicitNewExpression
        | FunctionCall
        | IndexedExpression
        | MethodCall
        | QueryExpression
        | RegexTemplateExpression
        | SimpleNameReference
        | StringLiteral
        | TypeCastExpression;
    trapKeyword: TrapKeyword;
  }
  
  export interface TrapKeyword extends STNode {
    isMissing: boolean;
    isToken: boolean;
    value: string;
  }
  
  export interface TripleBacktickToken extends STNode {
    isMissing: boolean;
    isToken: boolean;
    value: string;
  }
  
  export interface TrippleEqualToken extends STNode {
    isMissing: boolean;
    isToken: boolean;
    value: string;
  }
  
  export interface TrippleGtToken extends STNode {
    isMissing: boolean;
    isToken: boolean;
    value: string;
  }
  
  export interface TrueKeyword extends STNode {
    isMissing: boolean;
    isToken: boolean;
    value: string;
  }
  
  export interface TupleTypeDesc extends STNode {
    closeBracketToken: CloseBracketToken;
    memberTypeDesc: (
        | AnyTypeDesc
        | AnydataTypeDesc
        | ArrayTypeDesc
        | BooleanTypeDesc
        | ByteTypeDesc
        | CommaToken
        | DecimalTypeDesc
        | ErrorTypeDesc
        | FloatTypeDesc
        | FunctionTypeDesc
        | HandleTypeDesc
        | IntTypeDesc
        | IntersectionTypeDesc
        | JsonTypeDesc
        | MapTypeDesc
        | NeverTypeDesc
        | NilTypeDesc
        | ObjectTypeDesc
        | OptionalTypeDesc
        | ParenthesisedTypeDesc
        | QualifiedNameReference
        | RecordTypeDesc
        | RestType
        | SimpleNameReference
        | SingletonTypeDesc
        | StringTypeDesc
        | TableTypeDesc
        | TupleTypeDesc
        | TypedescTypeDesc
        | UnionTypeDesc
        | XmlTypeDesc
    )[];
    openBracketToken: OpenBracketToken;
  }
  
  export interface TypeCastExpression extends STNode {
    expression:
        | AnnotAccess
        | BooleanLiteral
        | BracedAction
        | BracedExpression
        | ByteArrayLiteral
        | CheckAction
        | CheckExpression
        | ErrorConstructor
        | ExplicitNewExpression
        | FieldAccess
        | FunctionCall
        | ImplicitNewExpression
        | IndexedExpression
        | ListConstructor
        | MappingConstructor
        | MethodCall
        | NumericLiteral
        | ObjectConstructor
        | OptionalFieldAccess
        | QueryAction
        | QueryExpression
        | RawTemplateExpression
        | RemoteMethodCallAction
        | SimpleNameReference
        | StartAction
        | StringLiteral
        | TableConstructor
        | TrapExpression
        | TypeCastExpression
        | XmlTemplateExpression;
    gtToken: GtToken;
    ltToken: LtToken;
    typeCastParam: TypeCastParam;
  }
  
  export interface TypeCastParam extends STNode {
    annotations: Annotation[];
    type?:
        | AnyTypeDesc
        | AnydataTypeDesc
        | ArrayTypeDesc
        | BooleanTypeDesc
        | ByteTypeDesc
        | DecimalTypeDesc
        | ErrorTypeDesc
        | FloatTypeDesc
        | FunctionTypeDesc
        | FutureTypeDesc
        | HandleTypeDesc
        | IntTypeDesc
        | IntersectionTypeDesc
        | JsonTypeDesc
        | MapTypeDesc
        | NilTypeDesc
        | ObjectTypeDesc
        | OptionalTypeDesc
        | QualifiedNameReference
        | ReadonlyTypeDesc
        | RecordTypeDesc
        | SimpleNameReference
        | SingletonTypeDesc
        | StreamTypeDesc
        | StringTypeDesc
        | TableTypeDesc
        | TupleTypeDesc
        | TypedescTypeDesc
        | UnionTypeDesc
        | XmlTypeDesc;
  }
  
  export interface TypeDefinition extends STNode {
    metadata?: Metadata;
    semicolonToken: SemicolonToken;
    typeDescriptor:
        | AnyTypeDesc
        | AnydataTypeDesc
        | ArrayTypeDesc
        | BooleanTypeDesc
        | ByteTypeDesc
        | DecimalTypeDesc
        | DistinctTypeDesc
        | ErrorTypeDesc
        | FloatTypeDesc
        | FunctionTypeDesc
        | FutureTypeDesc
        | HandleTypeDesc
        | IntTypeDesc
        | IntersectionTypeDesc
        | JsonTypeDesc
        | MapTypeDesc
        | NeverTypeDesc
        | NilTypeDesc
        | ObjectTypeDesc
        | OptionalTypeDesc
        | ParenthesisedTypeDesc
        | QualifiedNameReference
        | ReadonlyTypeDesc
        | RecordTypeDesc
        | SimpleNameReference
        | SingletonTypeDesc
        | StreamTypeDesc
        | StringTypeDesc
        | TableTypeDesc
        | TupleTypeDesc
        | TypedescTypeDesc
        | UnionTypeDesc
        | XmlTypeDesc;
    typeKeyword: TypeKeyword;
    typeName: IdentifierToken;
    visibilityQualifier?: PublicKeyword;
  }
  
  export interface TypeDocReferenceToken extends STNode {
    isMissing: boolean;
    isToken: boolean;
    value: string;
  }
  
  export interface TypeKeyword extends STNode {
    isMissing: boolean;
    isToken: boolean;
    value: string;
  }
  
  export interface TypeParameter extends STNode {
    gtToken: GtToken;
    ltToken: LtToken;
    typeNode:
        | AnyTypeDesc
        | AnydataTypeDesc
        | ArrayTypeDesc
        | BooleanTypeDesc
        | ByteTypeDesc
        | DecimalTypeDesc
        | ErrorTypeDesc
        | FloatTypeDesc
        | FunctionTypeDesc
        | FutureTypeDesc
        | HandleTypeDesc
        | IntTypeDesc
        | IntersectionTypeDesc
        | JsonTypeDesc
        | MapTypeDesc
        | NeverTypeDesc
        | NilTypeDesc
        | ObjectTypeDesc
        | OptionalTypeDesc
        | ParenthesisedTypeDesc
        | QualifiedNameReference
        | RecordTypeDesc
        | SimpleNameReference
        | StreamTypeDesc
        | StringTypeDesc
        | TableTypeDesc
        | TupleTypeDesc
        | TypedescTypeDesc
        | UnionTypeDesc
        | XmlTypeDesc;
  }
  
  export interface TypeReference extends STNode {
    asteriskToken: AsteriskToken;
    semicolonToken: SemicolonToken;
    typeName: QualifiedNameReference | SimpleNameReference;
  }
  
  export interface TypeTestExpression extends STNode {
    expression:
        | AnnotAccess
        | BooleanLiteral
        | BracedExpression
        | ExplicitAnonymousFunctionExpression
        | ExplicitNewExpression
        | FieldAccess
        | FunctionCall
        | IndexedExpression
        | ListConstructor
        | MethodCall
        | NumericLiteral
        | ObjectConstructor
        | OptionalFieldAccess
        | QualifiedNameReference
        | SimpleNameReference
        | StringLiteral
        | TypeCastExpression;
    isKeyword: IsKeyword | NotIsKeyword;
    typeDescriptor:
        | AnyTypeDesc
        | AnydataTypeDesc
        | ArrayTypeDesc
        | BooleanTypeDesc
        | ByteTypeDesc
        | DecimalTypeDesc
        | ErrorTypeDesc
        | FloatTypeDesc
        | FunctionTypeDesc
        | FutureTypeDesc
        | HandleTypeDesc
        | IntTypeDesc
        | IntersectionTypeDesc
        | JsonTypeDesc
        | MapTypeDesc
        | NeverTypeDesc
        | NilTypeDesc
        | ObjectTypeDesc
        | OptionalTypeDesc
        | ParenthesisedTypeDesc
        | QualifiedNameReference
        | ReadonlyTypeDesc
        | RecordTypeDesc
        | SimpleNameReference
        | SingletonTypeDesc
        | StreamTypeDesc
        | StringTypeDesc
        | TableTypeDesc
        | TupleTypeDesc
        | TypedescTypeDesc
        | UnionTypeDesc
        | XmlTypeDesc;
  }
  
  export interface TypedBindingPattern extends STNode {
    bindingPattern: CaptureBindingPattern | ErrorBindingPattern | ListBindingPattern | MappingBindingPattern | WildcardBindingPattern;
    typeDescriptor:
        | AnyTypeDesc
        | AnydataTypeDesc
        | ArrayTypeDesc
        | BooleanTypeDesc
        | ByteTypeDesc
        | DecimalTypeDesc
        | DistinctTypeDesc
        | ErrorTypeDesc
        | FloatTypeDesc
        | FunctionTypeDesc
        | FutureTypeDesc
        | HandleTypeDesc
        | IntTypeDesc
        | IntersectionTypeDesc
        | JsonTypeDesc
        | MapTypeDesc
        | NeverTypeDesc
        | NilTypeDesc
        | ObjectTypeDesc
        | OptionalTypeDesc
        | ParenthesisedTypeDesc
        | QualifiedNameReference
        | ReadonlyTypeDesc
        | RecordTypeDesc
        | SimpleNameReference
        | SingletonTypeDesc
        | StreamTypeDesc
        | StringTypeDesc
        | TableTypeDesc
        | TupleTypeDesc
        | TypedescTypeDesc
        | UnionTypeDesc
        | VarTypeDesc
        | XmlTypeDesc;
  }
  
  export interface TypedescKeyword extends STNode {
    isMissing: boolean;
    isToken: boolean;
    value: string;
  }
  
  export interface TypedescTypeDesc extends STNode {
    keywordToken: TypedescKeyword;
    typeParamNode?: TypeParameter;
  }
  
  export interface TypeofExpression extends STNode {
    expression: BracedExpression | CheckExpression | FieldAccess| IndexedExpression | FunctionCall | ListConstructor | NilLiteral | NumericLiteral | SimpleNameReference;
    typeofKeyword: TypeofKeyword;
  }
  
  export interface TypeofKeyword extends STNode {
    isMissing: boolean;
    isToken: boolean;
    value: string;
  }
  
  export interface UnaryExpression extends STNode {
    expression:
        | BooleanLiteral
        | BracedExpression
        | FieldAccess
        | FunctionCall
        | IndexedExpression
        | MethodCall
        | NumericLiteral
        | QualifiedNameReference
        | SimpleNameReference
        | StringLiteral
        | UnaryExpression;
    unaryOperator: ExclamationMarkToken | MinusToken | NegationToken | PlusToken;
  }
  
  export interface UnderscoreKeyword extends STNode {
    isMissing: boolean;
    isToken: boolean;
    value: string;
  }
  
  export interface UnionTypeDesc extends STNode {
    leftTypeDesc:
        | AnyTypeDesc
        | AnydataTypeDesc
        | ArrayTypeDesc
        | BooleanTypeDesc
        | ByteTypeDesc
        | DecimalTypeDesc
        | DistinctTypeDesc
        | ErrorTypeDesc
        | FloatTypeDesc
        | FunctionTypeDesc
        | FutureTypeDesc
        | HandleTypeDesc
        | IntTypeDesc
        | IntersectionTypeDesc
        | JsonTypeDesc
        | MapTypeDesc
        | NeverTypeDesc
        | NilTypeDesc
        | ObjectTypeDesc
        | OptionalTypeDesc
        | ParenthesisedTypeDesc
        | QualifiedNameReference
        | ReadonlyTypeDesc
        | RecordTypeDesc
        | SimpleNameReference
        | SingletonTypeDesc
        | StreamTypeDesc
        | StringTypeDesc
        | TableTypeDesc
        | TupleTypeDesc
        | TypedescTypeDesc
        | UnionTypeDesc
        | XmlTypeDesc;
    pipeToken: PipeToken;
    rightTypeDesc:
        | AnyTypeDesc
        | AnydataTypeDesc
        | ArrayTypeDesc
        | BooleanTypeDesc
        | ByteTypeDesc
        | DecimalTypeDesc
        | DistinctTypeDesc
        | ErrorTypeDesc
        | FloatTypeDesc
        | FunctionTypeDesc
        | FutureTypeDesc
        | HandleTypeDesc
        | IntTypeDesc
        | IntersectionTypeDesc
        | JsonTypeDesc
        | MapTypeDesc
        | NeverTypeDesc
        | NilTypeDesc
        | ObjectTypeDesc
        | OptionalTypeDesc
        | ParenthesisedTypeDesc
        | QualifiedNameReference
        | ReadonlyTypeDesc
        | RecordTypeDesc
        | SimpleNameReference
        | SingletonTypeDesc
        | StreamTypeDesc
        | StringTypeDesc
        | TableTypeDesc
        | TupleTypeDesc
        | TypedescTypeDesc
        | XmlTypeDesc;
  }
  
  export interface VarDocReferenceToken extends STNode {
    isMissing: boolean;
    isToken: boolean;
    value: string;
  }
  
  export interface VarKeyword extends STNode {
    isMissing: boolean;
    isToken: boolean;
    value: string;
  }
  
  export interface VarTypeDesc extends STNode {
    name: VarKeyword;
  }
  
  export interface VariableDocReferenceToken extends STNode {
    isMissing: boolean;
    isToken: boolean;
    value: string;
  }
  
  export interface WaitAction extends STNode {
    waitFutureExpr: BinaryExpression | FieldAccess | FunctionCall | SimpleNameReference | StartAction | WaitFieldsList;
    waitKeyword: WaitKeyword;
  }
  
  export interface WaitField extends STNode {
    colon: ColonToken;
    fieldName: SimpleNameReference;
    waitFutureExpr: FunctionCall | SimpleNameReference;
  }
  
  export interface WaitFieldsList extends STNode {
    closeBrace: CloseBraceToken;
    openBrace: OpenBraceToken;
    waitFields: (CommaToken | SimpleNameReference | WaitField)[];
  }
  
  export interface WaitKeyword extends STNode {
    isMissing: boolean;
    isToken: boolean;
    value: string;
  }
  
  export interface WhereClause extends STNode {
    expression:
        | BinaryExpression
        | BooleanLiteral
        | BracedExpression
        | FunctionCall
        | NumericLiteral
        | SimpleNameReference
        | TypeTestExpression
        | UnaryExpression;
    whereKeyword: WhereKeyword;
  }
  
  export interface WhereKeyword extends STNode {
    isMissing: boolean;
    isToken: boolean;
    value: string;
  }
  
  export interface WhileKeyword extends STNode {
    isMissing: boolean;
    isToken: boolean;
    value: string;
  }
  
  export interface WhileStatement extends STNode {
    condition:
        | BinaryExpression
        | BooleanLiteral
        | BracedExpression
        | FunctionCall
        | ListConstructor
        | NilLiteral
        | NumericLiteral
        | SimpleNameReference
        | StringLiteral
        | TypeTestExpression
        | UnaryExpression;
    onFailClause?: OnFailClause;
    whileBody: BlockStatement;
    whileKeyword: WhileKeyword;
  }
  
  export interface WildcardBindingPattern extends STNode {
    underscoreToken: UnderscoreKeyword;
  }
  
  export interface WorkerKeyword extends STNode {
    isMissing: boolean;
    isToken: boolean;
    value: string;
  }
  
  export interface XmlAtomicNamePattern extends STNode {
    colon: ColonToken;
    name: AsteriskToken | IdentifierToken;
    prefix: IdentifierToken;
  }
  
  export interface XmlAttribute extends STNode {
    attributeName: XmlQualifiedName | XmlSimpleName;
    equalToken: EqualToken;
    value: XmlAttributeValue;
  }
  
  export interface XmlAttributeValue extends STNode {
    endQuote: DoubleQuoteToken | SingleQuoteToken;
    startQuote: DoubleQuoteToken | SingleQuoteToken;
    value: (Interpolation | XmlTextContent)[];
  }
  
  export interface XmlCdata extends STNode {
    cdataEnd: XmlCdataEndToken;
    cdataStart: XmlCdataStartToken;
    content: (Interpolation | XmlTextContent)[];
  }
  
  export interface XmlCdataEndToken extends STNode {
    isMissing: boolean;
    isToken: boolean;
    value: string;
  }
  
  export interface XmlCdataStartToken extends STNode {
    isMissing: boolean;
    isToken: boolean;
    value: string;
  }
  
  export interface XmlComment extends STNode {
    commentEnd: XmlCommentEndToken;
    commentStart: XmlCommentStartToken;
    content: (Interpolation | XmlTextContent)[];
  }
  
  export interface XmlCommentEndToken extends STNode {
    isMissing: boolean;
    isToken: boolean;
    value: string;
  }
  
  export interface XmlCommentStartToken extends STNode {
    isMissing: boolean;
    isToken: boolean;
    value: string;
  }
  
  export interface XmlElement extends STNode {
    content: (Interpolation | XmlCdata | XmlComment | XmlElement | XmlEmptyElement | XmlPi | XmlText)[];
    endTag: XmlElementEndTag;
    startTag: XmlElementStartTag;
  }
  
  export interface XmlElementEndTag extends STNode {
    getToken: GtToken;
    ltToken: LtToken;
    name: XmlQualifiedName | XmlSimpleName;
    slashToken: SlashToken;
  }
  
  export interface XmlElementStartTag extends STNode {
    attributes: XmlAttribute[];
    getToken: GtToken;
    ltToken: LtToken;
    name: XmlQualifiedName | XmlSimpleName;
  }
  
  export interface XmlEmptyElement extends STNode {
    attributes: XmlAttribute[];
    getToken: GtToken;
    ltToken: LtToken;
    name: XmlQualifiedName | XmlSimpleName;
    slashToken: SlashToken;
  }
  
  export interface XmlFilterExpression extends STNode {
    expression: FunctionCall | SimpleNameReference | XmlStepExpression;
    xmlPatternChain: XmlNamePatternChain;
  }
  
  export interface XmlKeyword extends STNode {
    isMissing: boolean;
    isToken: boolean;
    value: string;
  }
  
  export interface XmlNamePatternChain extends STNode {
    gtToken: GtToken;
    startToken: DotLtToken | DoubleSlashDoubleAsteriskLtToken | SlashLtToken;
    xmlNamePattern: (AsteriskToken | PipeToken | SimpleNameReference | XmlAtomicNamePattern)[];
  }
  
  export interface XmlNamespaceDeclaration extends STNode {
    asKeyword?: AsKeyword;
    namespacePrefix?: IdentifierToken;
    namespaceuri: StringLiteral;
    semicolonToken: SemicolonToken;
    xmlnsKeyword: XmlnsKeyword;
  }
  
  export interface XmlPi extends STNode {
    data: (Interpolation | XmlTextContent)[];
    piEnd: XmlPiEndToken;
    piStart: XmlPiStartToken;
    target: XmlSimpleName;
  }
  
  export interface XmlPiEndToken extends STNode {
    isMissing: boolean;
    isToken: boolean;
    value: string;
  }
  
  export interface XmlPiStartToken extends STNode {
    isMissing: boolean;
    isToken: boolean;
    value: string;
  }
  
  export interface XmlQualifiedName extends STNode {
    colon: ColonToken;
    name: XmlSimpleName;
    prefix: XmlSimpleName;
  }
  
  export interface XmlSimpleName extends STNode {
    name: IdentifierToken;
  }
  
  export interface XmlStepExpression extends STNode {
    expression: BracedExpression | IndexedExpression | SimpleNameReference | TypeCastExpression | XmlFilterExpression | XmlStepExpression;
    xmlStepStart: SlashAsteriskToken | XmlNamePatternChain;
  }
  
  export interface XmlTemplateExpression extends STNode {
    content: (Interpolation | XmlCdata | XmlComment | XmlElement | XmlEmptyElement | XmlPi | XmlText)[];
    endBacktick: BacktickToken;
    startBacktick: BacktickToken;
    type: XmlKeyword;
  }
  
  export interface XmlText extends STNode {
    content: XmlTextContent;
  }
  
  export interface XmlTextContent extends STNode {
    isMissing: boolean;
    isToken: boolean;
    value: string;
  }
  
  export interface XmlTypeDesc extends STNode {
    keywordToken: XmlKeyword;
    typeParamNode?: TypeParameter;
  }
  
  export interface XmlnsKeyword extends STNode {
    isMissing: boolean;
    isToken: boolean;
    value: string;
  }
  

  
  // eslint-enable ban-types
  