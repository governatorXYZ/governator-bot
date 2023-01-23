export default Object.freeze({
    APP_VERSION: process.env.npm_package_version,
    APP_NAME: 'Governator',
    SSE_URL: `${process.env.GOVERNATOR_API_BASE_PATH}/${process.env.GOVERNATOR_API_PREFIX}/${process.env.GOVERNATOR_API_ENDPOINT_SSE}`,
});

export const strategyTypes = Object.freeze({
    STRATEGY_TYPE_TOKEN_WEIGHTED: 'TOKEN_WEIGHTED',
    STRATEGY_TYPE_ONE_EQUALS_ONE: 'ONE_EQUALS_ONE',
});