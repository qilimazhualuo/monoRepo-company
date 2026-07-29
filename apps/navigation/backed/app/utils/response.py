def success(data=None):
    return {"code": "200", "data": data}


def error(message=None):
    return {"code": "500", "data": message}
