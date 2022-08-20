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

"use strict";

import {
    cd,
    debug,
    loc,
    error as taskError,
    mkdirP,
    setResourcePath,
    setResult,
    TaskResult,
    tool,
    which,
} from "azure-pipelines-task-lib/task";
import { IExecOptions } from "azure-pipelines-task-lib/toolrunner";
import { dirname, join } from "path";

import { Clouds, TaskParameters } from "./models/taskParameters";
import { AzureModels } from "./models/azureModels";
import { ScriptType, ScriptTypeFactory } from "./lib/scriptType";
import { ScriptLocation } from "./lib/enum";

export const workingDir = `${process.env.AGENT_WORKFOLDER}/_pbicli`;
const FAIL_ON_STDERR = "FAIL_ON_STDERR";

setResourcePath(join(__dirname, "../task.json"));

executeTask();

async function executeTask() {
    const taskParameters = new TaskParameters();
    const azureModel = new AzureModels();

    const options = { env: process.env };
    if (taskParameters.Debug) {
        options.env["npm_config_loglevel"] = "verbose";
    } else {
        options.env["npm_config_loglevel"] = "silent";
    }

    // try find PbiCli globally
    const pbicli = which("pbicli", false);
    if (!pbicli) {
        await installPbiCli(taskParameters.Version, options);
        process.env["PATH"] += `:${workingDir}/node_modules/.bin/`;
    }
    await checkVersionPbiCli(options);

    await authenticatePbiCli(azureModel, taskParameters, options);

    await executeScript(taskParameters);
}

async function executeScript(taskParameters: TaskParameters) {
    let toolExecutionError = null;
    let exitCode = 0;
    const scriptType: ScriptType = ScriptTypeFactory.getSriptType(taskParameters);
    try {
        const tool = await scriptType.getTool();
        let cwd = taskParameters.Cwd;
        if (taskParameters.ScriptLocation === ScriptLocation.SCRIPTPATH && !taskParameters.Cwd) {
            cwd = dirname(taskParameters.ScriptPath as string);
        }
        if (cwd) {
            mkdirP(cwd);
            cd(cwd);
        }

        exitCode = await tool.exec({
            failOnStdErr: false,
            ignoreReturnCode: true,
        });

        let errLinesCount = 0;
        const aggregatedErrorLines: string[] = [];
        tool.on("errline", (errorLine: string) => {
            if (errLinesCount < 10) {
                aggregatedErrorLines.push(errorLine);
            }
            errLinesCount++;
        });

        if (taskParameters.FailOnStdErr && aggregatedErrorLines.length > 0) {
            const error = FAIL_ON_STDERR;
            taskError(aggregatedErrorLines.join("\n"));
            throw error;
        }
    } catch (err: unknown) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        toolExecutionError = (err as any).stderr || err;
    } finally {
        if (scriptType) {
            await scriptType.cleanUp();
        }

        if (toolExecutionError === FAIL_ON_STDERR) {
            setResult(TaskResult.Failed, loc("PbiCli_ScriptFailedStdErr"));
        } else if (toolExecutionError) {
            setResult(TaskResult.Failed, loc("PbiCli_ScriptFailed", toolExecutionError));
        } else if (exitCode != 0) {
            setResult(TaskResult.Failed, loc("PbiCli_ScriptFailedWithExitCode", exitCode));
        } else {
            setResult(TaskResult.Succeeded, loc("PbiCli_ScriptReturnCode", 0));
        }
    }
}

async function authenticatePbiCli(azureModel: AzureModels, taskParameters: TaskParameters, options: IExecOptions) {
    if (taskParameters.Cloud !== Clouds.PUBLIC)
        await executePbiCliCommand(`cloud set --name ${Clouds.PUBLIC.toString()}`, options);
    if (azureModel.AuthScheme.toLowerCase() == "serviceprincipal") {
        await executePbiCliCommand(
            `login --service-principal --principal ${azureModel.ServicePrincipalClientId} --secret ${azureModel.ServicePrincipalKey} --tenant ${azureModel.TenantId}`,
            options
        );
    } else {
        throw loc("PbiCli_AuthSchemeNotSupported", azureModel.AuthScheme);
    }
}

async function checkVersionPbiCli(options: IExecOptions) {
    await executePbiCliCommand("version", options);
}

async function installPbiCli(version: string, options: IExecOptions) {
    try {
        const npmRunner = tool(which("npm", true));
        npmRunner.line(`i @powerbi-cli/powerbi-cli@${version} --prefix ${workingDir}`);
        const code: number = await npmRunner.exec(options);
        setResult(code, loc("Npm_ReturnCode", code));
    } catch (err: unknown) {
        debug("installPbiCli() fail");
        setResult(TaskResult.Failed, loc("Npm_Failed", (err as Error).message));
    }
}

async function executePbiCliCommand(command: string, options: IExecOptions) {
    try {
        const pbicliRunner = tool(which("pbicli", false));
        pbicliRunner.line(command);
        const code: number = await pbicliRunner.exec(options);
        setResult(code, loc("PbiCli_ReturnCode", code));
    } catch (err: unknown) {
        debug("executePbiCliCommand() fail");
        setResult(TaskResult.Failed, loc("PbiCli_Failed", (err as Error).message));
    }
}
