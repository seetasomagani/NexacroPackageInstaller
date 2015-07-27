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

        // $JSON start
    else if (this.datatype == 4) {

        //var e = new Error('JSON construction');
        //application.trace(e.stack);
        return this.__deserializeJSON(strRecvData);
    }
        //$JSON end

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
    //doc = strRecvData.substring(4, strRecvData.length).trim();
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
                dataset.setColumn(row, curCol.name, currentValue[curCol.name]);
            });
        });
    } else {
        var row = dataset.addRow();
        columns.forEach(function (curCol) {
            dataset.setColumn(row, curCol.name, data[curCol.name]);
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
}
//JSONBinding v0.2