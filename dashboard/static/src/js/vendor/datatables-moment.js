(function (factory) {
    if (typeof define === "function" && define.amd) {
        define(["jquery", "moment", "datatables.net"], factory);
    } else {
        factory(jQuery, moment);
    }
}(function ($, moment) {

    $.fn.dataTable.moment = function ( format, locale ) {
        var types = $.fn.dataTable.ext.type;

        // Add type detection
        types.detect.unshift( function ( d ) {
            if ( d ) {
                // Strip HTML tags and newline characters if possible
                if ( d.replace ) {
                    d = d.replace(/(<.*?>)|(\r?\n|\r)/g, '');
                }

                // Strip out surrounding white space
                d = $.trim( d );
            }

            // Null and empty values are acceptable
            if ( d === '' || d === null ) {
                return 'moment-'+format;
            }

            return moment( d, format, locale, true ).isValid() ?
                'moment-'+format :
                null;
        } );

        // Add sorting method - use an integer for the sorting
        types.order[ 'moment-'+format+'-pre' ] = function ( d ) {
            if ( d ) {
                // Strip HTML tags and newline characters if possible
                if ( d.replace ) {
                    d = d.replace(/(<.*?>)|(\r?\n|\r)/g, '');
                }

                // Strip out surrounding white space
                d = $.trim( d );
            }

            return d === '' || d === null ?
                -Infinity :
                parseInt( moment( d, format, locale, true ).format( 'x' ), 10 );
        };
    };

}));
