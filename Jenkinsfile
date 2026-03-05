/**
 * Jenkins Pipeline – Build, Test & Deploy the Employee Time Tracking App to AKS
 *
 * Prerequisites (one-time setup):
 *   1. Jenkins plugins: Pipeline, Docker Pipeline, Kubernetes CLI, Azure Credentials
 *   2. Jenkins credentials:
 *      - 'acr-credentials'       : Username/Password for Azure Container Registry
 *      - 'aks-kubeconfig'        : Kubeconfig file (Secret file) for the target AKS cluster
 *      - 'jwt-secret'            : Secret text – production JWT_SECRET value
 *      - 'azure-sql-server'      : Secret text – Azure SQL server hostname (e.g. myserver.database.windows.net)
 *      - 'azure-sql-database'    : Secret text – Azure SQL database name
 *      - 'azure-sql-user'        : Secret text – Azure SQL username
 *      - 'azure-sql-password'    : Secret text – Azure SQL password
 *   3. An Azure Container Registry (ACR) already provisioned
 *   4. An AKS cluster with:
 *      - NGINX Ingress Controller installed
 *   5. Node.js 20 available on the Jenkins agent (or use a Docker agent)
 */

pipeline {
    agent any

    environment {
        // ── Azure Container Registry ──────────────────────────────────
        ACR_LOGIN_SERVER = "${params.ACR_LOGIN_SERVER ?: 'myacr.azurecr.io'}"
        IMAGE_NAME       = 'timesheet-app'
        IMAGE_TAG        = "${env.BUILD_NUMBER}-${env.GIT_COMMIT?.take(7) ?: 'latest'}"

        // ── Kubernetes / AKS ──────────────────────────────────────────
        K8S_NAMESPACE    = 'timesheet-app'
        INGRESS_HOST     = "${params.INGRESS_HOST ?: 'timesheet.example.com'}"

        // ── Misc ──────────────────────────────────────────────────────
        DOCKER_IMAGE     = "${ACR_LOGIN_SERVER}/${IMAGE_NAME}:${IMAGE_TAG}"
    }

    parameters {
        string(name: 'ACR_LOGIN_SERVER', defaultValue: 'myacr.azurecr.io',
               description: 'Azure Container Registry login server (e.g. myacr.azurecr.io)')
        string(name: 'INGRESS_HOST', defaultValue: 'timesheet.example.com',
               description: 'Hostname for the Kubernetes Ingress resource')
        booleanParam(name: 'SKIP_TESTS', defaultValue: false,
                     description: 'Skip the test stage (not recommended)')
        booleanParam(name: 'DEPLOY', defaultValue: true,
                     description: 'Deploy to AKS after a successful build')
    }

    options {
        timestamps()
        timeout(time: 30, unit: 'MINUTES')
        disableConcurrentBuilds()
        buildDiscarder(logRotator(numToKeepStr: '20'))
    }

    stages {
        // ────────────────────────────────────────────────────────────
        // 1. Checkout
        // ────────────────────────────────────────────────────────────
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        // ────────────────────────────────────────────────────────────
        // 2. Install Dependencies
        // ────────────────────────────────────────────────────────────
        stage('Install Dependencies') {
            parallel {
                stage('Backend Dependencies') {
                    steps {
                        dir('backend') {
                            sh 'npm ci'
                        }
                    }
                }
                stage('Frontend Dependencies') {
                    steps {
                        dir('frontend') {
                            sh 'npm ci'
                        }
                    }
                }
            }
        }

        // ────────────────────────────────────────────────────────────
        // 3. Run Tests
        // ────────────────────────────────────────────────────────────
        stage('Run Tests') {
            when {
                expression { return !params.SKIP_TESTS }
            }
            steps {
                dir('backend') {
                    sh 'npm run test:ci'
                }
            }
            post {
                always {
                    junit(testResults: 'backend/junit.xml', allowEmptyResults: true)
                }
            }
        }

        // ────────────────────────────────────────────────────────────
        // 4. Build Frontend
        // ────────────────────────────────────────────────────────────
        stage('Build Frontend') {
            steps {
                dir('frontend') {
                    sh 'npm run build'
                }
            }
        }

        // ────────────────────────────────────────────────────────────
        // 5. Docker Build & Push to ACR
        // ────────────────────────────────────────────────────────────
        stage('Docker Build & Push') {
            steps {
                script {
                    docker.withRegistry("https://${ACR_LOGIN_SERVER}", 'acr-credentials') {
                        def appImage = docker.build(
                            "${DOCKER_IMAGE}",
                            "-f docker/Dockerfile ."
                        )
                        appImage.push()
                        appImage.push('latest')
                    }
                }
            }
        }

        // ────────────────────────────────────────────────────────────
        // 6. Deploy to AKS
        // ────────────────────────────────────────────────────────────
        stage('Deploy to AKS') {
            when {
                expression { return params.DEPLOY }
            }
            steps {
                withCredentials([
                    file(credentialsId: 'aks-kubeconfig', variable: 'KUBECONFIG'),
                    string(credentialsId: 'jwt-secret', variable: 'JWT_SECRET_VALUE'),
                    string(credentialsId: 'azure-sql-server', variable: 'AZURE_SQL_SERVER'),
                    string(credentialsId: 'azure-sql-database', variable: 'AZURE_SQL_DATABASE'),
                    string(credentialsId: 'azure-sql-user', variable: 'AZURE_SQL_USER'),
                    string(credentialsId: 'azure-sql-password', variable: 'AZURE_SQL_PASSWORD')
                ]) {
                    script {
                        // 6a. Create / ensure namespace
                        sh "kubectl apply -f k8s/namespace.yaml"

                        // 6b. Apply ConfigMap
                        sh "kubectl apply -f k8s/configmap.yaml"

                        // 6c. Create or update the Secret with JWT and Azure SQL credentials
                        sh """
                            kubectl create secret generic timesheet-app-secret \\
                                --namespace=${K8S_NAMESPACE} \\
                                --from-literal=JWT_SECRET="\${JWT_SECRET_VALUE}" \\
                                --from-literal=AZURE_SQL_SERVER="\${AZURE_SQL_SERVER}" \\
                                --from-literal=AZURE_SQL_DATABASE="\${AZURE_SQL_DATABASE}" \\
                                --from-literal=AZURE_SQL_USER="\${AZURE_SQL_USER}" \\
                                --from-literal=AZURE_SQL_PASSWORD="\${AZURE_SQL_PASSWORD}" \\
                                --dry-run=client -o yaml | kubectl apply -f -
                        """

                        // 6d. Substitute image placeholders and apply Deployment
                        sh """
                            sed -e 's|__ACR_LOGIN_SERVER__|${ACR_LOGIN_SERVER}|g' \\
                                -e 's|__IMAGE_TAG__|${IMAGE_TAG}|g' \\
                                k8s/deployment.yaml | kubectl apply -f -
                        """

                        // 6e. Apply Service
                        sh "kubectl apply -f k8s/service.yaml"

                        // 6f. Substitute ingress host and apply Ingress
                        sh """
                            sed 's|__INGRESS_HOST__|${INGRESS_HOST}|g' \\
                                k8s/ingress.yaml | kubectl apply -f -
                        """

                        // 6g. Wait for rollout to complete
                        sh """
                            kubectl rollout status deployment/timesheet-app \\
                                --namespace=${K8S_NAMESPACE} \\
                                --timeout=300s
                        """
                    }
                }
            }
        }

        // ────────────────────────────────────────────────────────────
        // 7. Smoke Test
        // ────────────────────────────────────────────────────────────
        stage('Smoke Test') {
            when {
                expression { return params.DEPLOY }
            }
            steps {
                withCredentials([
                    file(credentialsId: 'aks-kubeconfig', variable: 'KUBECONFIG')
                ]) {
                    script {
                        // Port-forward and hit the health endpoint
                        sh """
                            kubectl port-forward \\
                                svc/timesheet-app 18080:80 \\
                                --namespace=${K8S_NAMESPACE} &
                            PF_PID=\$!
                            sleep 5
                            HTTP_CODE=\$(curl -s -o /dev/null -w '%{http_code}' http://localhost:18080/health)
                            kill \$PF_PID || true
                            if [ "\$HTTP_CODE" != "200" ]; then
                                echo "Smoke test FAILED – /health returned HTTP \$HTTP_CODE"
                                exit 1
                            fi
                            echo "Smoke test PASSED – /health returned HTTP 200"
                        """
                    }
                }
            }
        }
    }

    post {
        success {
            echo """
            =============================================
             Deployment Successful
             Image : ${DOCKER_IMAGE}
             Host  : ${INGRESS_HOST}
            =============================================
            """
        }
        failure {
            echo 'Pipeline FAILED – check the stage logs above for details.'
        }
        always {
            cleanWs()
        }
    }
}
