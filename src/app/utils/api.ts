const ApiUtils = {

    getBasePath(){
        return `${process.env.GOVERNATOR_API_BASE_PATH}/${process.env.GOVERNATOR_API_PREFIX}`
    }
}

export default ApiUtils;