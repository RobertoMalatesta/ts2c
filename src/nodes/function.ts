import * as ts from 'typescript';
import {CodeTemplate, CodeTemplateFactory} from '../template';
import {IScope, CProgram} from '../program';
import {ArrayType} from '../types';
import {CVariable, CVariableDestructors} from './variable';

@CodeTemplate(`
{returnType} {name}({parameters {, }=> {this}})
{
    {variables  {    }=> {this};\n}
    {#if gcVarName}
        ARRAY_CREATE({gcVarName}, 2, 0);
    {/if}

    {statements {    }=> {this}}

    {destructors}
}`, ts.SyntaxKind.FunctionDeclaration)
export class CFunction implements IScope {
    public parent: IScope;
    public returnType: string;
    public name: string;
    public parameters: CVariable[] = [];
    public variables: CVariable[] = [];
    public statements: any[] = [];
    public gcVarName: string;
    public destructors: CVariableDestructors;
    constructor(public root: CProgram, funcDecl: ts.FunctionDeclaration) {
        this.parent = root;
        let signature = root.typeChecker.getSignatureFromDeclaration(funcDecl);

        this.name = funcDecl.name.getText();
        this.returnType = root.typeHelper.getTypeString(signature.getReturnType());
        this.parameters = signature.parameters.map(p => new CVariable(this, p.name, p, { removeStorageSpecifier: true }));
        this.variables = [];

        this.gcVarName = root.memoryManager.getGCVariableForScope(funcDecl);
        if (this.gcVarName)
            root.variables.push(new CVariable(this, this.gcVarName, new ArrayType("void *", 0, true)));

        funcDecl.body.statements.forEach(s => this.statements.push(CodeTemplateFactory.createForNode(this, s)));

        if (funcDecl.body.statements[funcDecl.body.statements.length - 1].kind != ts.SyntaxKind.ReturnStatement) {
            this.destructors = new CVariableDestructors(this, funcDecl);
        }

    }
}