window.esvServiceUrl = 'http://localhost:3000'

function testConnection()
{
    //Perform an AJAX POST request to the url
    axios.post(window.esvServiceUrl + '/api/v1/testpost', { 
        'id': 9,
        'value': 19
    })
        .then(function (response) {
            //When successful, print 'Success: ' and the received data
            if(response.data[0].result == 'OK')
            {
                alert("OK");
            }
        })
        .catch(function (error) {
            //When unsuccessful, print the error.
            showErrorMessage(error);
        });
}

function showErrorMessage(message)
{
    alert(message);
}