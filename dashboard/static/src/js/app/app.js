// app.js

/* serializeObject serializes form elements into a JSON object
 * Source: http://stackoverflow.com/questions/1184624/convert-form-data-to-javascript-object-with-jquery
 */
$.fn.serializeObject = function()
{
    var o = {};
    var a = this.serializeArray();
    $.each(a, function() {
        if (o[this.name] !== undefined) {
            if (!o[this.name].push) {
                o[this.name] = [o[this.name]];
            }
            o[this.name].push(this.value || '');
        } else {
            o[this.name] = this.value || '';
        }
    });
    return o;
};
$.fn.dataTable.moment('MMMM Do YYYY, h:mm:ss a');
$.fn.select2.defaults.set( "theme", "bootstrap" );

String.prototype.capitalize = function() {
    return this.charAt(0).toUpperCase() + this.slice(1);
}
