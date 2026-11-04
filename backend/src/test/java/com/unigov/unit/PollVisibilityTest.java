package com.unigov.unit;

import com.unigov.entity.Filiere;
import com.unigov.entity.Poll;
import com.unigov.entity.Promotion;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertEquals;

/**
 * Test unitaire — technique boîte noire : table de décision sur Poll.isVisibleTo().
 * Exigence EF-07 (ciblage des sondages par filière / promotion).
 */
class PollVisibilityTest {

    @ParameterizedTest(name = "[{index}] targetAll={0}, cible=({1},{2}), étudiant=({3},{4}) -> visible={5}")
    @DisplayName("Table de décision : visibilité d'un sondage ciblé")
    @CsvSource(nullValues = "-", value = {
            // targetAll, filiereCible, promoCible, filiereEtu, promoEtu, attendu
            "true,  -,    -,              INFO, PREMIERE_ANNEE, true",
            "false, INFO, -,              INFO, PREMIERE_ANNEE, true",
            "false, INFO, -,              MECA, PREMIERE_ANNEE, false",
            "false, -,    DEUXIEME_ANNEE, INFO, DEUXIEME_ANNEE, true",
            "false, -,    DEUXIEME_ANNEE, INFO, PREMIERE_ANNEE, false",
            "false, INFO, DEUXIEME_ANNEE, INFO, DEUXIEME_ANNEE, true",
            "false, INFO, DEUXIEME_ANNEE, INFO, PREMIERE_ANNEE, false",
            "false, INFO, DEUXIEME_ANNEE, GSIL, DEUXIEME_ANNEE, false",
            "false, INFO, -,              -,    -,              true",
    })
    void visibilite(boolean targetAll, Filiere fCible, Promotion pCible,
                    Filiere fEtu, Promotion pEtu, boolean attendu) {
        Poll poll = new Poll();
        poll.setTargetAll(targetAll);
        if (fCible != null) poll.setTargetFilieres(Set.of(fCible));
        if (pCible != null) poll.setTargetPromotions(Set.of(pCible));

        assertEquals(attendu, poll.isVisibleTo(fEtu, pEtu));
    }
}
