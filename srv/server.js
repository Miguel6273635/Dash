const express = require("express");
const {
    executeHttpRequest
} = require("@sap-cloud-sdk/http-client");

const app = express();

app.get("/api/dashboard/mantenimiento", async (req, res) => {
    try {
        const oResponse = await executeHttpRequest(
            {
                destinationName: "QAS_MITSU_DASH"
            },
            {
                method: "GET",
                url: "/sap/opu/odata/sap/NOMBRE_SERVICIO_SRV/EntitySet?$format=json",
                headers: {
                    Accept: "application/json"
                }
            }
        );

        const aResults =
            oResponse.data?.d?.results ||
            oResponse.data?.value ||
            [];

        res.json({
            success: true,
            data: aResults
        });
    } catch (oError) {
        console.error("Error consultando SAP OData:", oError);

        res.status(500).json({
            success: false,
            message: "No fue posible consultar SAP ECC",
            detail:
                oError.response?.data ||
                oError.message
        });
    }
});

const iPort = process.env.PORT || 4004;

app.listen(iPort, () => {
    console.log(`Dashboard API ejecutándose en el puerto ${iPort}`);
});