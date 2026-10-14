package Koha::Plugin::Com::OpenFifth::AgrovocValueBuilder;

use Modern::Perl;

use base qw(Koha::Plugins::Base);

use C4::Output qw( output_html_with_http_headers output_with_http_headers );
use CGI        qw( -utf8 );
use HTTP::Tiny;
use JSON qw( to_json );

our $VERSION         = '1.0.0';
our $MINIMUM_VERSION = "24.11.00.000";

our $metadata = {
    name            => 'AGROVOC Value Builder',
    author          => "Jacob O'Mara",
    description     => 'Value builder plugin for AGROVOC thesaurus integration',
    date_authored   => '2026-10-14',
    date_updated    => '2026-10-14',
    minimum_version => $MINIMUM_VERSION,
    maximum_version => undef,
    version         => $VERSION,
};

use constant AGROVOC_REST_URL => 'https://agrovoc.fao.org/browse/rest/v1';

our %CONCEPT_TYPES = map { $_ => 1 } qw( broader narrower related );

sub new {
    my ( $class, $args ) = @_;

    $args->{'metadata'} = $metadata;
    $args->{'metadata'}->{'class'} = $class;

    my $self = $class->SUPER::new($args);

    return $self;
}

=head2 get_valuebuilder

Returns the value builder identifier exposed to the MARC framework editor.

=cut

sub get_valuebuilder {
    return 'agrovoc';
}

=head2 builder_code

Returns the JavaScript that opens the AGROVOC popup from the cataloguing editor.

=cut

sub builder_code {
    my ( $self, $params ) = @_;

    my $function_name = $params->{id};
    my $plugin_url    = $self->get_valuebuilder_url();

    return qq|
<script>
function Click$function_name(ev) {
    ev.preventDefault();
    var liElement = ev.target.closest('li[id^="tag_"]');
    window.open("$plugin_url&li_id=" + encodeURIComponent(liElement.id), "agrovoc", "width=900,height=600,toolbar=false,scrollbars=yes");
}
</script>
|;
}

=head2 launcher

Serves the popup template, or proxies a search or concept lookup to AGROVOC.

=cut

sub launcher {
    my ( $self, $args ) = @_;

    $self->{cgi} = $args->{cgi} if $args->{cgi};
    $self->{cgi} //= CGI->new;

    my $cgi    = $self->{cgi};
    my $action = $cgi->param('action') // '';

    return $self->_respond_json( $cgi, $self->_search($cgi) )         if $action eq 'search';
    return $self->_respond_json( $cgi, $self->_fetch_concepts($cgi) ) if $action eq 'fetch_concepts';

    my $template = $self->get_template( { file => 'agrovoc_search.tt' } );
    $template->param( plugin_url => $self->get_valuebuilder_url() );

    return output_html_with_http_headers( $cgi, undef, $template->output );
}

sub _respond_json {
    my ( $self, $cgi, $content ) = @_;

    return output_with_http_headers( $cgi, undef, $content, 'json' );
}

sub _search {
    my ( $self, $cgi ) = @_;

    my $search_term = $cgi->param('searchTerm') // '';
    my $match_type  = $cgi->param('matchType')  // 'starts_with';
    my $lang        = $cgi->param('lang')       // 'en';

    return to_json( { error => 'Search term cannot be empty' } ) unless length $search_term;

    $search_term = "*$search_term*" if $match_type eq 'contains';
    $search_term = "$search_term*"  if $match_type eq 'starts_with';

    my $url = AGROVOC_REST_URL . '/search?query=' . CGI::escape($search_term) . '&lang=' . CGI::escape($lang);

    return _get($url);
}

sub _fetch_concepts {
    my ( $self, $cgi ) = @_;

    my $vocid = $cgi->param('vocid') // 'agrovoc';
    my $uri   = $cgi->param('uri')   // '';
    my $lang  = $cgi->param('lang')  // 'en';
    my $type  = $cgi->param('type')  // '';

    return to_json( { error => 'Unknown concept type' } )    unless $CONCEPT_TYPES{$type};
    return to_json( { error => 'Unknown vocabulary id' } )   unless $vocid =~ m/^[a-zA-Z0-9_-]+$/;
    return to_json( { error => 'Concept uri is required' } ) unless length $uri;

    my $url = AGROVOC_REST_URL . "/$vocid/$type?uri=" . CGI::escape($uri) . '&lang=' . CGI::escape($lang);

    return _get($url);
}

sub _get {
    my ($url) = @_;

    my $response = HTTP::Tiny->new->get($url);

    return to_json( { error => "$response->{status} $response->{reason}" } )
        unless $response->{success};

    return $response->{content};
}

1;
