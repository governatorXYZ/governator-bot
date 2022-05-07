export default Object.freeze({
	APP_VERSION: process.env.npm_package_version,
	APP_NAME: 'Governator',
	SSE_URL: `${process.env.GOVERNATOR_API_BASE_PATH}/${process.env.GOVERNATOR_API_PREFIX}/${process.env.GOVERNATOR_API_ENDPOINT_SSE}`,
});