nexacro.TransactionItem.prototype._parseDSParam = function (paramStr) {
    if (!paramStr) {
        return undefined;
    }

    var list = [];

    var expr = /([a-zA-Z가-힣_$][a-zA-Z가-힣0-9_$]*)\s*=\s*([a-zA-Z가-힣_$][a-zA-Z가-힣0-9_$]*(\.?[a-zA-Z가-힣0-9_$]*)*(?:\:[aAuUnN])?)/g; // 2014-07-31 case hangle , $

    var splitedParams = paramStr.match(expr);

    if (!splitedParams || splitedParams.length == 0) {
        return undefined;
    }
    var splitedParamCnt = splitedParams.length;

    var listLength = 0;

    for (var i = 0; i < splitedParamCnt; i++) {
        var param = splitedParams[i].split("=");
        var key = param[0].trim();
        var value = param[1].trim();

        var bduplicate = false;
        for (var j = 0; j < i; j++) {
            var checkparam = splitedParams[j].split("=");
            var checkkey = checkparam[0].trim();
            if (key == checkkey) {
                bduplicate = true;
            }
        }
        if (bduplicate) {
            i++;
            return false;
        }

        var type = "N";

        var index = value.indexOf(":");
        if (index > -1) {
            type = value.substring(index + 1);
            value = value.substring(0, index);
        }

        var paramObj =
        {
            lval: key,
            rval: value,
            saveType: type
        };
        list.push(paramObj);
    }
    return list;
};

nexacro.TransactionItem.prototype._deserializeData = function (strRecvData, bPending) {
    if (!strRecvData) {
        return [-1, "Stream Data is null!"];
    }

    strRecvData = strRecvData.trim();
    var fstr = strRecvData.substring(0, 3);

    if (fstr == "SSV") // SSV Type (HEX:53,53,56)
    {
        return this.__deserializeSSV(strRecvData);
    }
    else if (fstr == "CSV") // CSV Type (HEX:43,53,56)
    {
        return this.__deserializeCSV(strRecvData);
    }
    else if (fstr == "PPX") // PPX Type : Runtime only
    {
        return this.__deserializePPX(strRecvData);
    }

        // JSON start
    else if (this.datatype == 4) 
    {
        return this.__deserializeJSON(strRecvData);
    }
        //JSON end

    else // XML Type (HEX:3C,3F)
    {
        return this.__deserializeXML(strRecvData);
    }

};

nexacro.TransactionItem.prototype._getAllDatasets = function () {
    var form = this.context;
    var outDatasets = this.outputDatasets;
    var datasetObjects = [];
    if (outDatasets && outDatasets.length) {
        var outDataCnt = outDatasets.length;
        for (var i = 0; i < outDataCnt; i++) {
            var param = outDatasets[i];
            datasetObjects[i] = form._getDatasetObject(param.lval);
        }
    }
    return datasetObjects;
};

nexacro.TransactionItem.prototype.__deserializeJSON = function (strRecvData, doc) {

    var parameters = [];
    var datasets = new nexacro.Collection();
    var code = 0;
    var message = "SUCCESS";

    var errorinfo = [code, message];
    doc = strRecvData.trim();
    doc = JSON.parse(doc);
    var ret = nexacro._getCommDataFromObj(doc, this);

    return [errorinfo, parameters, datasets];
}

nexacro._getCommDataFromObj = function (doc, target) {
    var variablelist = [];

    var datasetlist = [];

    var form = target.context;
    var outDatasets = target.outputDatasets;
    var datasetObjects = [];
    if (outDatasets && outDatasets.length) {
        var outDataCnt = outDatasets.length;
        for (var i = 0; i < outDataCnt; i++) {
            var param = outDatasets[i];
            datasetObject = form._getDatasetObject(param.lval);
            datasetObject.rowposition = -1;
            datasetObject.bindJSON(nexacro._queryJSON(doc, param.rval));
            datasetObjects[i] = datasetObject;
        }
    }

    return [variablelist, datasetlist];
}

nexacro._queryJSON = function (obj, query) {
    
    if (!query)
        return obj;

    var queryTerms = query.split(".");

    var result;
    var target = obj

    for (var i = 0; i < queryTerms.length; i++) {
        result = target[queryTerms[i]];
        target = result;
    }
    return result;
}

nexacro.Dataset.prototype.bindJSON = function (data) {

    this.deleteAll();
    var dataset = this;
    var columns = [];
    for (i = 0; i < dataset.getColCount() ; i++) {
        columns[i] = dataset.getColumnInfo(i);
    }
    if (data.constructor === Array) {        
        data.forEach(function (currentValue) {
            var row = dataset.addRow();
            columns.forEach(function (curCol) {
                dataset.setColumn(row, curCol.name, nexacro._queryJSON(currentValue, curCol.name));
            });
        });
    } else {
        var row = dataset.addRow();
        columns.forEach(function (curCol) {
            dataset.setColumn(row, curCol.name, nexacro._queryJSON(data, curCol.name));
        });
    }
}
 
nexacro.Dataset.prototype.getRow = function (rowIndex) {
    if (rowIndex >= this.getRowCount())
        return undefined;

    var columns = [];
    var data = [];
    for (i = 0; i < this.getColCount() ; i++) {
        columns[i] = this.getColumnInfo(i).name;
    }

    var datum = {};

    for (j = 0; j < columns.length; j++) {
        datum[columns[j]] = this.getColumn(rowIndex, columns[j]);
    }

    return datum;
}

nexacro.Dataset.prototype.getData = function () {

    var rowIndex = 0;
    var data = [this.getRowCount()];

    for (rowIndex = 0; rowIndex < this.getRowCount() ; rowIndex++) {
        data[rowIndex] = this.getRow(rowIndex);
    }
    return data;
};

if (nexacro.Browser != "Runtime")
nexacro.__startCommunication = function (loadItem, path, cachelevel, async, referer, senddata, ndatatype, compress, ver, failpass, service)
        {
            var _ajax;
            if (loadItem.type == "data" && (nexacro._isHybrid && nexacro._isHybrid()) && ndatatype == 1)
                _ajax = nexacro.__createFakeHttpRequest(ndatatype, compress);
            else
                _ajax = nexacro.__createHttpRequest();

            var ajax_handle = _ajax._handle;

            // parse protocol	    
            if (path.indexOf("://") > -1)
            {
                var ar = path.split("://");
                var protocol = ar[0];
                switch (protocol)
                {
                    case "http": _ajax._protocol = 0; break;
                    case "https": _ajax._protocol = 1; break;
                    case "file": _ajax._protocol = 2; break;
                    default: _ajax._protocol = -1; break;
                }
            }

            var bindfn = null;
            var method = "GET";
            var mime_xml = false;
            var mime_json = false;

            if (loadItem.type == "module")
            {
                bindfn = nexacro.__bindLoadModuleHandler(_ajax, loadItem);
            }
            else if (loadItem.type == "data")
            {
                //$JSON start
                if(ndatatype == 4) {
                    bindfn = nexacro.__bindLoadDataHandler(_ajax, loadItem);
                    mime_json = true;
                    //$JSON end
                } else {
                    bindfn = nexacro.__bindLoadDataHandler(_ajax, loadItem);
                    method = "POST";
                    mime_xml = true;
                }
            }
            else if (loadItem.type == "text")
            {
                bindfn = nexacro.__bindLoadTextHandler(_ajax, loadItem);
            }
            else  //for update
            {
                bindfn = nexacro.__bindLoadUpdateHandler(_ajax, loadItem);
            }

            if (async)
                ajax_handle.onreadystatechange = bindfn;

            try
            {
                ajax_handle.open(method, path, !!async);
            }
            catch (e)
            {
                loadItem.on_error(e.number, "comm_fail_loaddetail", e.number);
                _ajax = null;
                return null;
            }

            if (mime_xml)
            {
                ajax_handle.setRequestHeader("X-Requested-With", "XMLHttpRequest");
                ajax_handle.setRequestHeader("Accept", "application/xml, text/xml, */*");
                ajax_handle.setRequestHeader("Content-Type","text/xml");                
                //   ajax_handle.setRequestHeader("cache-control", "no-cache");
            }

            var header_vars = application._header_variables;
            var header_vars_len = header_vars.length;
            if (header_vars_len > 0)
            {
                var header_id, header_value;
                for (var i = 0; i < header_vars_len; i++)
                {
                    header_id = header_vars[i];
                    header_value = application[header_id];
                    if (header_id && header_value)
                        ajax_handle.setRequestHeader(header_id, header_value);
                }
            }

            if (mime_xml && service)
            {
                if (service.cachelevel == "none")
                {
                    //$JSON start
                    ajax_handle.setRequestHeader("cache-control", "no-cache, no-store");
                    ajax_handle.setRequestHeader("Pragma", "no-cache");
                    ajax_handle.setRequestHeader("If-Modified-Since", "Sat, 1 Jan 2000 00:00:00 GMT");
                    ajax_handle.setRequestHeader("Expires", -1);
                    //$JSON end
                }
                else
                {
                    ajax_handle.setRequestHeader("cache-control", "no-cache");
                    ajax_handle.setRequestHeader("If-Modified-Since", loadItem.last_modified);
                }
            }

            try
            {
                if (async)
                {
                    // httptimeout property use for only async
                    if (ajax_handle.timeout) //no have property from made by activeObject, add check property by comnik 20150324
                        ajax_handle.timeout = application.httptimeout * 1000;
                }
                ajax_handle.send(senddata ? senddata : null);
                if (!async)
                    bindfn(_ajax, loadItem);
            }
            catch (e)
            {
                if (_ajax._user_aborted)
                    loadItem.on_error(e.number, "comm_stop_transaction_byesc");
                else
                    loadItem.on_error(e.number, "comm_fail_loaddetail", e.number);
                return null;
            }
            ajax_handle = null;
            return _ajax;
        };

//JSONBinding v0.3