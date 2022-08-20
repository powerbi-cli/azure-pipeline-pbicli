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

import {
    getEndpointAuthorizationParameter,
    getEndpointAuthorizationScheme,
    getEndpointDataParameter,
    getEndpointUrl,
    getInput,
    loc,
} from "azure-pipelines-task-lib";

export class AzureModels {
    private authScheme?: string;
    private connectedServiceName: string;
    private subscriptionId?: string;
    private subscriptionName?: string;
    private servicePrincipalClientId: string;
    private servicePrincipalKey: string;
    private environmentAuthorityUrl?: string;
    private environmentUrl: string;
    private tenantId: string;
    private url?: string;

    constructor() {
        try {
            this.connectedServiceName = getInput("connectedServiceNameARM", true) as string;
            if (this.connectedServiceName === "local") {
                // local debug
                this.subscriptionId = getInput("subscriptionid", true) as string;
                this.subscriptionName = getInput("subscriptionname", true) as string;
                this.servicePrincipalClientId = getInput("serviceprincipalid", true) as string;
                this.servicePrincipalKey = getInput("serviceprincipalkey", true) as string;
                this.environmentUrl = getInput("environmentUrl", true) as string;
                this.environmentAuthorityUrl = getInput("environmentAuthorityUrl", true) as string;
                this.tenantId = getInput("tenantid", true) as string;
                this.url = getInput("connectedServiceNameUrl", true) as string;
            } else {
                this.authScheme = getEndpointAuthorizationScheme(this.connectedServiceName, false);
                this.subscriptionId = getEndpointDataParameter(this.connectedServiceName, "subscriptionid", true);
                this.subscriptionName = getEndpointDataParameter(this.connectedServiceName, "subscriptionname", true);
                this.servicePrincipalClientId = getEndpointAuthorizationParameter(
                    this.connectedServiceName,
                    "serviceprincipalid",
                    true
                ) as string;
                this.servicePrincipalKey = getEndpointAuthorizationParameter(
                    this.connectedServiceName,
                    "serviceprincipalkey",
                    true
                ) as string;
                this.environmentUrl = getEndpointDataParameter(
                    this.connectedServiceName,
                    "environmentUrl",
                    true
                ) as string;
                this.environmentAuthorityUrl = getEndpointDataParameter(
                    this.connectedServiceName,
                    "environmentAuthorityUrl",
                    true
                );
                this.tenantId = getEndpointAuthorizationParameter(
                    this.connectedServiceName,
                    "tenantid",
                    false
                ) as string;
                this.url = getEndpointUrl(this.connectedServiceName, true);
            }
        } catch (err: unknown) {
            throw new Error(loc("AzureModels_ConstructorFailed", (err as Error).message));
        }
    }

    public get AuthScheme(): string {
        return this.authScheme || "ServicePrincipal";
    }

    public get SubscriptionId(): string {
        return this.subscriptionId as string;
    }

    public get SubscriptionName(): string {
        return this.subscriptionName as string;
    }

    public get ServicePrincipalClientId(): string {
        return this.servicePrincipalClientId;
    }

    public get ServicePrincipalKey(): string {
        return this.servicePrincipalKey;
    }

    public get Audience(): string {
        return `https://${this.EnvironmentUrl}/.default`;
    }

    public get EnvironmentUrl(): string {
        return new URL(this.environmentUrl).hostname as string;
    }

    public get EnvironmentAuthorityUrl(): string {
        return this.environmentAuthorityUrl as string;
    }

    public get TenantId(): string {
        return this.tenantId;
    }

    public getUrl(): string {
        return this.url as string;
    }
}
