#!/bin/bash
set -e

echo "🔍 TamaFriends Deployment Status Dashboard"
echo "========================================"

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to check stack status
check_stack_status() {
    local environment=$1
    local stack_type=$2
    local stack_name="SocialMediaApp-${environment}-${stack_type}"

    echo -e "\n${BLUE}📋 ${stack_type} Stack (${environment})${NC}"
    echo "Stack: $stack_name"

    # Get stack status
    status=$(aws cloudformation describe-stacks --stack-name "$stack_name" --query 'Stacks[0].StackStatus' --output text 2>/dev/null || echo "NOT_FOUND")

    case $status in
        "CREATE_COMPLETE"|"UPDATE_COMPLETE")
            echo -e "Status: ${GREEN}✅ $status${NC}"
            ;;
        "CREATE_IN_PROGRESS"|"UPDATE_IN_PROGRESS")
            echo -e "Status: ${YELLOW}🔄 $status${NC}"
            ;;
        "CREATE_FAILED"|"UPDATE_FAILED"|"ROLLBACK_COMPLETE"|"UPDATE_ROLLBACK_COMPLETE")
            echo -e "Status: ${RED}❌ $status${NC}"
            ;;
        "NOT_FOUND")
            echo -e "Status: ${RED}❌ Stack not found${NC}"
            return 1
            ;;
        *)
            echo -e "Status: ${YELLOW}⚠️  $status${NC}"
            ;;
    esac

    # Get stack outputs if available
    if [ "$status" = "CREATE_COMPLETE" ] || [ "$status" = "UPDATE_COMPLETE" ]; then
        echo "Outputs:"
        aws cloudformation describe-stacks --stack-name "$stack_name" --query 'Stacks[0].Outputs[].{Key:OutputKey,Value:OutputValue}' --output table 2>/dev/null || echo "  No outputs available"

        # Get last update time
        last_updated=$(aws cloudformation describe-stacks --stack-name "$stack_name" --query 'Stacks[0].LastUpdatedTime' --output text 2>/dev/null || aws cloudformation describe-stacks --stack-name "$stack_name" --query 'Stacks[0].CreationTime' --output text)
        echo "Last Updated: $last_updated"
    fi

    return 0
}

# Function to check API health
check_api_health() {
    local environment=$1
    local api_url

    echo -e "\n${BLUE}🌐 API Health Check (${environment})${NC}"

    # Get API URL from CloudFormation
    api_url=$(aws cloudformation describe-stacks --stack-name "SocialMediaApp-${environment}-Api" --query 'Stacks[0].Outputs[?OutputKey==`ApiGatewayUrl`].OutputValue' --output text 2>/dev/null || echo "")

    if [ -z "$api_url" ]; then
        echo -e "API URL: ${RED}❌ Not found${NC}"
        return 1
    fi

    echo "API URL: $api_url"

    # Test basic connectivity
    response_code=$(curl -s -o /dev/null -w "%{http_code}" "$api_url/health" 2>/dev/null || echo "000")

    case $response_code in
        "200")
            echo -e "Health Check: ${GREEN}✅ Healthy (HTTP $response_code)${NC}"
            ;;
        "000")
            echo -e "Health Check: ${RED}❌ No response${NC}"
            ;;
        *)
            echo -e "Health Check: ${YELLOW}⚠️  HTTP $response_code${NC}"
            ;;
    esac

    # Test response time
    if [ "$response_code" = "200" ]; then
        response_time=$(curl -s -o /dev/null -w "%{time_total}" "$api_url/health" 2>/dev/null || echo "0")
        response_ms=$(echo "$response_time * 1000" | bc -l 2>/dev/null || echo "0")
        echo "Response Time: ${response_ms%.*}ms"
    fi
}

# Main execution
main() {
    local environment=${1:-"all"}

    # Check AWS credentials
    if ! aws sts get-caller-identity >/dev/null 2>&1; then
        echo -e "${RED}❌ AWS credentials not configured${NC}"
        exit 1
    fi

    echo "AWS Account: $(aws sts get-caller-identity --query Account --output text)"
    echo "AWS Region: $(aws configure get region || echo $AWS_DEFAULT_REGION)"
    echo "Timestamp: $(date -u)"

    # Define environments to check
    if [ "$environment" = "all" ]; then
        environments=("dev" "staging" "production")
    else
        environments=("$environment")
    fi

    # Check each environment
    for env in "${environments[@]}"; do
        echo -e "\n${YELLOW}🌍 Environment: $env${NC}"
        echo "=========================="

        # Check stacks
        check_stack_status "$env" "Database"
        check_stack_status "$env" "Media"
        check_stack_status "$env" "Api"

        # Check services
        check_api_health "$env"
    done

    echo -e "\n${GREEN}✅ Status check complete!${NC}"
}

# Script usage
usage() {
    echo "Usage: $0 [environment]"
    echo "  environment: dev, staging, production, or all (default: all)"
    echo ""
    echo "Examples:"
    echo "  $0           # Check all environments"
    echo "  $0 dev       # Check only dev environment"
    echo "  $0 production # Check only production environment"
}

# Parse command line arguments
if [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
    usage
    exit 0
fi

# Run main function
main "$1"