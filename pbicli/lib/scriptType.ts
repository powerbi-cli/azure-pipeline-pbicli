/*
 * Power BI CLI Task
 *
 * Copyright (c) 2022 Jan Pieter Posthuma / DataScenarios
 *
 * All rights reserved.
 *
 * MIT License.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 *  of this software and associated documentation files (the "Software"), to deal
 *  in the Software without restriction, including without limitation the rights
 *  to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 *  copies of the Software, and to permit persons to whom the Software is
 *  furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 *  all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 *  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 *  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 *  AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 *  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 *  OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 *  THE SOFTWARE.
 */

// Based on ScriptType factory from the Azure CLI task:
// https://github.com/microsoft/azure-pipelines-tasks/blob/master/Tasks/AzureCLIV2/src/ScriptType.ts

import { Utility } from "./Utility";
import { which, tool } from "azure-pipelines-task-lib/task";
import { ToolRunner } from "azure-pipelines-task-lib/toolrunner";

import { TaskParameters } from "../models/taskParameters";
import { ScriptLocation, ScriptTypes } from "./enum";

export class ScriptTypeFactory {
    public static getSriptType(taskParameters: TaskParameters): ScriptType {
        const scriptType = taskParameters.ScriptType;
        switch (scriptType) {
            case ScriptTypes.PS:
                return new WindowsPowerShell(taskParameters);
            case ScriptTypes.PSCORE:
                return new PowerShellCore(taskParameters);
            case ScriptTypes.BASH:
                return new Bash(taskParameters);
            case ScriptTypes.BATCH:
            default:
                return new Batch(taskParameters);
        }
    }
}

export abstract class ScriptType {
    protected taskParameters: TaskParameters;
    protected scriptPath = "";

    constructor(taskParameters: TaskParameters) {
        this.taskParameters = taskParameters;
    }

    public abstract getTool(): Promise<ToolRunner>;

    public async cleanUp(): Promise<void> {
        if (this.taskParameters.ScriptLocation === ScriptLocation.INLINESCRIPT) {
            await Utility.deleteFile(this.scriptPath);
        }
    }
}

export class WindowsPowerShell extends ScriptType {
    public async getTool(): Promise<ToolRunner> {
        this.scriptPath = await Utility.getPowerShellScriptPath(this.taskParameters, ["ps1"]);
        const tl = tool(which("powershell", true))
            .arg("-NoLogo")
            .arg("-NoProfile")
            .arg("-NonInteractive")
            .arg("-ExecutionPolicy")
            .arg("Unrestricted")
            .arg("-Command")
            .arg(`. '${this.scriptPath.replace(/'/g, "''")}'`);
        return tl;
    }

    public async cleanUp(): Promise<void> {
        await Utility.deleteFile(this.scriptPath);
    }
}

export class PowerShellCore extends ScriptType {
    public async getTool(): Promise<ToolRunner> {
        this.scriptPath = await Utility.getPowerShellScriptPath(this.taskParameters, ["ps1"]);
        const tl = tool(which("pwsh", true))
            .arg("-NoLogo")
            .arg("-NoProfile")
            .arg("-NonInteractive")
            .arg("-ExecutionPolicy")
            .arg("Unrestricted")
            .arg("-Command")
            .arg(`. '${this.scriptPath.replace(/'/g, "''")}'`);
        return tl;
    }

    public async cleanUp(): Promise<void> {
        await Utility.deleteFile(this.scriptPath);
    }
}

export class Bash extends ScriptType {
    public async getTool(): Promise<ToolRunner> {
        this.scriptPath = await Utility.getScriptPath(this.taskParameters, ["sh"]);
        const tl = tool(which("bash", true));
        tl.arg(this.scriptPath);
        tl.line(this.taskParameters.ScriptArguments); // additional scriptArguments should always call line. line() parses quoted arg strings
        return tl;
    }
}

export class Batch extends ScriptType {
    public async getTool(): Promise<ToolRunner> {
        this.scriptPath = await Utility.getScriptPath(this.taskParameters, ["bat", "cmd"]);
        const tl = tool(which(this.scriptPath, true));
        tl.line(this.taskParameters.ScriptArguments); // additional scriptArguments should always call line. line() parses quoted arg strings
        return tl;
    }
}
